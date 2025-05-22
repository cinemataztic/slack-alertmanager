# Slack AlertManager

Slack AlertManager is built on [@slack-webhook](https://www.npmjs.com/package/@slack/webhook) that allows clients to send alerts to a dedicated slack channel. The Slack AlertManager has a configurable throttling feature that ensures no error messages are spammed.

The purpose of this package is to provide an application level Slack alertmanager which would help in raising alerts to i.e QA or engineering team in case something went wrong during an application's lifecycle. The package requires minimal setup and only requires the slack webhook URL to get started with this package.

## Getting started

The package is available on [npm](https://www.npmjs.com/package/@cinemataztic/slack-alertmanager), and can be installed with:

```sh
npm i @cinemataztic/slack-alertmanager
```

## Prerequisites

Node.js version should be >=18.

## Usage

To use the module, you must require it.

```js
const { SlackAlertManager } = require('@cinemataztic/slack-alertmanager');
```

## Configuration

Configurations must be passed to the SlackAlertManager to initialize Slack Webhooks internally.

### `config`

- `slackWebhookUrl?: string`

  The webhook URL from Slack which will be used for the initialization of Slack Webhooks internally. This is a required field. In order to create a webhook URL, follow the instructions in [here](https://api.slack.com/messaging/webhooks#getting_started).

- `slackUsername?: string`

  The name that shows up in engineering channel i.e Bob. In case no value is provided, the package sets a default name.

  Default value is `default`.

- `alertCooldown?: number`

  The number of milliseconds for an alert cooldown for the same event alert. This ensures that messages are not spammed constantly and are throttled as per the configuration. In case no alert cooldown time in milliseconds is provided, the package sets a default alert cooldown time.

  Default value is `60000`.

```js
const slackAlertManager = new SlackAlertManager({
  slackWebhookUrl: SLACK_WEBHOOK_URL,
  slackUsername: 'Bob',
  alertCooldown: 60000,
});
```

## Indicate that the process is up and running

To indicate within the application, that a process/service is up and running, provide the names of entity and subject. Entity is the source i.e 'Producer' and subject is the process i.e in case of Producer it can be a topic.

This will set the state of entity + subject to 1 which indicates that the combination of entiy and source is in ON state. 

This will only send an alert to Slack channel once the same combination had a state set to 0 an OFF state, and now has the state set to 1, on ON state. Clients can send an optional textBody in case they want to notify that a particular process/service is up and running.

```js
slackAlertManager.up('producer', 'some-topic', 'Kafka producer is running');
```

## Indicate that the process is down and is not running

To indicate within the application, that a process/service is down and is not running, provide the names of entity ,subject, and the textBody that the slack webhooks would delegate to the slack channel. Entity is the source i.e 'Consumer', subject is the process i.e in case of Consumer it can be a topic, and the textBody is a message that can have emoticons for readability.

This will set the state of entity + subject to 0 which indicates that the combination of entiy and source is in OFF state. 

This will send an alert to slack channel with a delay of alert time cooldown that is configured during initialization.

```js
slackAlertManager.down('consumer', 'some-topic', 'broker transport failure');
```

## Basic Slack Alerts

To send a basic slack alert without worrying about the internal state management of the entity + entity's subject. The client can simply call the following method with a textBody.

```js
slackAlertManager.sendAlert('something happened');
```

## Clear internal states

To clear the states of the entity + entity's subject. The client can simply call the following method for clearing out all the states internally. This will reset the states of entity + entity's subject i.e no ON or OFF states for multiple combinations.

```js
slackAlertManager.clear();
```

## Motivation

Many of our services are relying upon the Kafka message queue system and other external systems with a high throughput. In case something goes wrong with any service running on Node.js pertaining to Kafka, there are no early alerts and rather the monitoring team has to report about an outage regarding Kafka in affected services. Slack alertmanager at an application level was introduced to address the concerns about failures or outages happening in the background without raising an alert. 

With a minimalist alertmanager package built upon [@slack-webhook](https://www.npmjs.com/package/@slack/webhook). The clients can get timely error alerts on their dedicated slack channel to mitigate the issues emanating from their applications. 
