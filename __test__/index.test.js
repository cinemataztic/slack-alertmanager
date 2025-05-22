jest.mock('@slack/webhook', () => ({
  IncomingWebhook: jest.fn().mockImplementation(function () {
    this.send = jest.fn();
  }),
}));

const { IncomingWebhook } = require('@slack/webhook');
const { SlackAlertManager } = require('../src/index.js');

describe('SlackAlertManager', () => {
  const SLACK_WEBHOOK_URL = 'mock-webhook-url';
  let slackAlertManager;
  let slackWebhook;

  beforeEach(() => {
    jest.useFakeTimers('modern').setSystemTime(0);

    IncomingWebhook.mockClear();

    slackAlertManager = new SlackAlertManager({
      slackWebhookUrl: SLACK_WEBHOOK_URL,
      slackUsername: 'default',
      alertCooldown: 60000,
    });

    slackWebhook = IncomingWebhook.mock.instances[0];
    slackWebhook.send.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Send an alert in case producer reports an error', async () => {
    await slackAlertManager.down(
      'producer',
      'mock-topic',
      'broker transport failure',
    );
    expect(slackWebhook.send).toHaveBeenCalledWith({
      text: 'broker transport failure',
    });
  });

  test('ensure separate alerts are sent in case of different topics for a producer', async () => {
    await slackAlertManager.down(
      'producer',
      'mock-topic',
      'broker transport failure',
    );

    await slackAlertManager.down(
      'producer',
      'mock-topic-1',
      'broker transport failure',
    );

    expect(slackWebhook.send).toHaveBeenCalledTimes(2);
    expect(slackWebhook.send).toHaveBeenNthCalledWith(1, {
      text: 'broker transport failure',
    });
    expect(slackWebhook.send).toHaveBeenNthCalledWith(2, {
      text: 'broker transport failure',
    });
  });

  test('ensure that alert cooldown is enforced', async () => {
    await slackAlertManager.down(
      'consumer',
      'mock-topic',
      'broker transport failure',
    );
    expect(slackWebhook.send).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30000);
    await slackAlertManager.down(
      'consumer',
      'mock-topic',
      'broker transport failure',
    );
    expect(slackWebhook.send).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(30000);
    await slackAlertManager.down(
      'consumer',
      'mock-topic',
      'broker transport failure',
    );
    expect(slackWebhook.send).toHaveBeenCalledTimes(2);
    expect(slackWebhook.send).toHaveBeenLastCalledWith({
      text: 'broker transport failure',
    });
  });

  test('allow slack alert in case the state is changed i.e consumer is in ON state after being in an OFF state', async () => {
    await slackAlertManager.down(
      'consumer',
      'mock-topic',
      'broker transport failure',
    );
    expect(slackWebhook.send).toHaveBeenCalledTimes(1);

    await slackAlertManager.up('consumer', 'mock-topic');
    expect(slackWebhook.send).toHaveBeenCalledTimes(2);
  });

  test('ensure that vanilla sendAlert is called without any prerequisites', () => {
    slackAlertManager.sendAlert('producer says hi');
    expect(slackWebhook.send).toHaveBeenCalledWith({
      text: 'producer says hi',
    });
  });

  test('ensure that clear resets state history', async () => {
    await slackAlertManager.down(
      'consumer',
      'mock-topic',
      'broker transport failure',
    );
    jest.advanceTimersByTime(60000);
    await slackAlertManager.up('consumer', 'mock-topic');
    expect(slackWebhook.send).toHaveBeenCalledTimes(2);

    slackAlertManager.clear();

    jest.advanceTimersByTime(60000);

    await slackAlertManager.down(
      'consumer',
      'mock-topic',
      'broker transport failure',
    );
    expect(slackWebhook.send).toHaveBeenCalledTimes(3);

    jest.advanceTimersByTime(60000);

    await slackAlertManager.up('consumer', 'mock-topic');
    expect(slackWebhook.send).toHaveBeenCalledTimes(4);
  });
});
