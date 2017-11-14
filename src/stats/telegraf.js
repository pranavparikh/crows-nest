'use strict';

const HotShots = require('hot-shots');
const Base = require('./base');
const logger = require('testarmada-logger');

/* istanbul ignore next */
class TelegrafAdaptor extends Base {
  constructor({ statsHost, statsPort, statsTelegraf }) {
    super();

    this.hotshots = new HotShots({
      host: statsHost,
      port: statsPort,
      telegraf: statsTelegraf
    });
  }

  gauge(key, timestamp, data, tags, callback) {
    logger.prefix = 'Crows Nest';
    logger.debug(key, data, tags);
    // hot-shots uses UDP
    this.hotshots.gauge(key, data, tags);

    return Promise.resolve();
  }
};

module.exports = TelegrafAdaptor;