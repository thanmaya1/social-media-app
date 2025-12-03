const setup = require('./setup');
const scheduler = require('../utils/scheduler');

describe('Scheduler smoke', () => {
  beforeAll(async () => {
    await setup.start();
  });
  afterAll(async () => {
    await setup.stop();
  });

  test('scheduler exports schedulePost and start/stop', async () => {
    expect(typeof scheduler.schedulePost === 'function').toBeTruthy();
    expect(typeof scheduler.startScheduler === 'function').toBeTruthy();
    expect(typeof scheduler.stopScheduler === 'function').toBeTruthy();
  });
});
