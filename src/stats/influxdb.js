'use strict';

const InfluxDB = require('influx').InfluxDB;
const moment = require('moment');
const _ = require('lodash');
const Base = require('./base');
const logger = require('testarmada-logger');

/* istanbul ignore next */
class InfluxDBAdaptor extends Base {
  constructor({ statsHost, statsPort, statsDatabase }) {
    super();

    this.influx = new InfluxDB({
      host: statsHost,
      port: statsPort,
      database: statsDatabase
    });
  }

  gauge(key, timestamp, data, tags, callback) {
    // data mapping and format
    logger.prefix = 'Crows Nest';

    let d = {
      measurement: key,
      tags: _.fromPairs(_.map(tags, (t) => t.split(':'))),
      fields: { duration: timestamp, value: data },
    };
    logger.debug(JSON.stringify(d));
    // return a promise
    return this.influx.writePoints([d]);
  }
};

module.exports = InfluxDBAdaptor;