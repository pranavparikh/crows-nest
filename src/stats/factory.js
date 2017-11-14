'use strict';

const Influx = require('./influxdb');
const Telegraf = require('./telegraf');
const logger = require('testarmada-logger');

const adaptors = {
  influxdb: Influx,
  telegraf: Telegraf
}

class AdaptorFactory {
  constructor(type, options) {
    logger.prefix = 'Crows Nest';

    if (adaptors[type]) {
      return new adaptors[type](options);
    }

    logger.err(`Stats adaptor ${type} isn't supported, please implement the adaptor in lib/stats/`);
    throw new Error('No such stats adaptor found in lib/stats/');
  }
};

module.exports = AdaptorFactory;