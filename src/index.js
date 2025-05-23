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

  #generateKey(entity, subject) {
    return `${entity}:${subject}`;
  }

  async #notify({ entity, state, subject, textBody }) {
    const key = this.#generateKey(entity, subject);
    const prevState = this.#lastStateMap.get(key);

    this.#lastStateMap.set(key, state);

    const now = Date.now();
    const lastTime = this.#lastAlertTimeMap.get(key);
    if (lastTime !== undefined && now - lastTime < this.#alertCooldown) {
      if (prevState === state) {
        return;
      }
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

  async up(entity, subject, textBody = '') {
    await this.#notify({ entity, state: 1, subject, textBody });
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
