const logger = require('testarmada-logger');
const schedule = require('node-schedule');

const logic = require('./monitor.logic');

logger.prefix = 'monitor';

const heartbeat = (tunnel, interval) => {
  logger.log(`Starting heartbeat at ${interval}`);
  schedule.scheduleJob(interval, () => {
    logic.heartBeatInterval(tunnel);
  });
};

const restart = (tunnel, interval) => {
  logger.log(`Starting restart interval at ${interval}`);
  schedule.scheduleJob(interval, async () => {
    logic.restartInterval(tunnel);
  });
};

module.exports = {
  heartbeat,
  restart,
};
