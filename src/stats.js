'use strict';

const _ = require('lodash');
const EventEmitter = require('events');
const os = require('os');

const Factory = require('./stats/factory');

const EVENT = {
  TUNNEL_STATUS: 'status',
  // How many connection attempts a tunnel has been made before failing
  TUNNEL_FAILED: 'failed',
  // How many connection attempts a tunnel has been made for now 
  TUNNEL_RETRYING: 'retrying',
  // How many attempts a tunnel has been made to successfully connect
  TUNNEL_CONNECTED: 'connected',
  // When a tunnel successfully stopped
  TUNNEL_STOPPED: 'stopped',
  // How long a tunnel run (unix timestamp)
  TUNNEL_AGE: 'age',
  // How long a tunnel takes to successfully connect
  TUNNEL_BUILD_CONNECTITON: 'connectcost'
};

class StatsQueue {
  constructor(options) {
    this.statsQueue = this.build();

    this.statsSwitch = options.statsSwitch;
    this.statsPrefix = options.statsPrefix;

    this.statsClient = options.statsClient ? options.statsClient : new Factory(options.statsType, _.omit(options, 'statsSwitch'));

  }

  build() {
    let queue = {};
    _.forEach(EVENT, (e) => {
      queue[e] = {};
    });

    return queue;
  }

  drain() {
    let self = this;
    let tempQueue = [];

    _.forEach(self.statsQueue, (v1, k1) => {
      _.forEach(v1, (v2, k2) => {
        tempQueue.push(self._generateStats(v2.event));
      });
    });

    return Promise
      .all(tempQueue)
      .then(() => {
        // reset statsQueue
        self.statsQueue = self.build();
        return Promise.resolve();
      })
      .catch((err) => {
        // we eat every error
        // reset statsQueue
        self.statsQueue = self.build();
        return Promise.resolve();
      });
  }

  push({ eventType, timestamp, tunnelIndex, data }) {
    let self = this;
    // statsQueue format
    /**
     * statsQueue = {
     *    event: {
     *      tunnelid: {
     *        timestamp: number
     *        event: {
     *          eventType: string,
     *          timestamp: number,
     *          tunnelIndex: number,
     *          data: number
     *        }
     *      }
     *    }
     * }
     * 
     */
    if (self.statsSwitch) {
      if (self.statsQueue[eventType]
        && (!self.statsQueue[eventType][tunnelIndex]
          || self.statsQueue[eventType][tunnelIndex].timestamp <= timestamp)) {
        // rules to overwrite current event 
        // 1.  first of its kind
        // 2.  latest of its kind
        self.statsQueue[eventType][tunnelIndex] = {
          timestamp: timestamp,
          event: {
            eventType: eventType,
            timestamp: timestamp,
            tunnelIndex: tunnelIndex,
            data: data
          }
        };
      }
    }
  }

  _generateStats({ eventType, timestamp, tunnelIndex, data }) {
    let self = this;

    return new Promise((resolve, reject) => {
      let key = `${self.statsPrefix}${eventType}`;

      self.statsClient
        .gauge(key, timestamp, data, [`hostname:${os.hostname()}`, `tunnelNum:${tunnelIndex}`])
        .then(() => {
          // we eat all errors here as some of the clients use UDP
          resolve();
        });

    });
  }
};

module.exports = {
  EVENT,
  StatsQueue
};