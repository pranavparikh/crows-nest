'use strict';

class BaseStats {
  constructor(options) { }

  gauge(key, timestamp, data, tags, callback) {
    return Promise.resolve();
  }
};

module.exports = BaseStats;