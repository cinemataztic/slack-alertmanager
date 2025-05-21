const { IncomingWebhook } = require('@slack/webhook');

class SlackAlertManager {
  #slackWebHook = null;

  #lastStateMap = new Map();

  #lastAlertTimeMap = new Map();

  #alertCooldown;

  constructor(config = {}) {
    this.#slackWebHook = new IncomingWebhook(config.slackWebhookUrl, {
      username: config.slackUsername || 'default',
    });
    this.#alertCooldown = config.alertCooldown || 60000;
  }

  async #notify({ entity, state, subject, textBody = '' }) {
    const key = { entity, subject };
    const prevState = this.#lastStateMap.get(key);
    if (prevState === state) {
      return;
    }

    this.#lastStateMap.set(key, state);

    const now = Date.now();
    const lastTime = this.#lastAlertTimeMap.get(key) || 0;
    if (now - lastTime < this.#alertCooldown) {
      return;
    }
    this.#lastAlertTimeMap.set(key, now);

    if (state === 0) {
      try {
        await this.#sendSlackAlert(textBody);
      } catch (error) {
        console.error(`Error sending slack alerts: ${error}`);
      }
    } else if (state === 1 && prevState === 0) {
      try {
        await this.#sendSlackAlert(textBody);
      } catch (error) {
        console.error(`Error sending slack alerts: ${error}`);
      }
    }
  }

  async up(entity, subject) {
    await this.#notify({ entity, state: 1, subject });
  }

  async down(entity, subject, textBody) {
    await this.#notify({ entity, state: 0, subject, textBody });
  }

  sendAlert(textBody) {
    this.#sendSlackAlert(textBody);
  }

  clear() {
    this.#lastStateMap.clear();
    this.#lastAlertTimeMap.clear();
  }

  async #sendSlackAlert(textBody) {
    try {
      await this.#slackWebHook.send({
        text: textBody,
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }
}

module.exports = { SlackAlertManager };
