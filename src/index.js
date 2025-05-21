/* eslint-disable max-len */
import { IncomingWebhook } from '@slack/webhook';

class AlertManager {
  #entity = null;

  #slackWebHook = null;

  #lastStateMap = new Map();

  #lastAlertTimeMap = new Map();

  #alertCooldown;

  constructor(
    entity,
    slackWebhookUrl,
    slackUsername = 'default',
    alertCooldown = 60000,
  ) {
    this.#entity = entity;
    this.#slackWebHook = new IncomingWebhook(slackWebhookUrl, {
      username: slackUsername,
    });
    this.#alertCooldown = alertCooldown;
  }

  async #notify({ state, subject, textBody = '' }) {
    const key = { entity: this.#entity, subject };
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

  async up(subject) {
    await this.#notify({ state: 1, subject });
  }

  async down(subject, textBody) {
    await this.#notify({ state: 0, subject, textBody });
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

export default AlertManager;
