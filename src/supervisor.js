'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs');
const schedule = require('node-schedule');
const logger = require('testarmada-logger');
const co = require('co');

const { STATE, Tunnel } = require('./tunnel');
const { EVENT, StatsQueue } = require('./stats');

const PORT_BEGIN = 4000;
const PORT_INDENT = 5;
const PID_TEMP_PATH = path.resolve(process.cwd(), 'temp');
// rolling restart all tunnels every 24 hours
const RESTART_INTERVAL = 86400000;

class Supervisor {
  constructor({ config, tunnelAmount, restartCron, statsSwitch }) {
    this.tunnels = [];
    this.config = config.supervisor;
    this.tunnelConfig = config.tunnel;
    this.tunnelAmount = tunnelAmount;
    this.restartCron = restartCron;
    this.statsConfig = config.stats;

    this.statsSwitch = statsSwitch;
    this.statsQueue = new StatsQueue(_.extend(this.statsConfig, {
      statsSwitch: statsSwitch,
      statsClient: statsSwitch ? null : { gauge() { return Promise.resolve(); } }
    }));

    this.statsHandle = null;
  }

  * stage() {
    logger.prefix = 'Crows Nest';

    // download sauce tunnel if necessary
    logger.log('/*************************************************/');
    logger.log(`Preparing ${this.tunnelAmount} Sauce Tunnel(s)`);

    if (this.restartCron) {
      logger.log(`Rolling restart is enabled with schedule: ${this.restartCron}`);
    }

    if (this.statsSwitch) {
      logger.log(`Stats is enabled with adaptor: ${this.statsConfig.statsType}`);
      logger.debug(`Stats will be pushed to ${JSON.stringify(this.statsConfig)}`);
    }
    logger.log('/*************************************************/');

    const pStart = this.config.portStart ? this.config.portStart : PORT_BEGIN;
    const pIndent = this.config.portIndent ? this.config.portIndent : PORT_INDENT;

    for (let i = 0; i < this.tunnelAmount; i++) {
      this.tunnels.push(new Tunnel(_.extend(this.tunnelConfig, {
        id: i + 1,
        port: pStart + i * pIndent,
        pidTempPath: PID_TEMP_PATH,
        statsQueue: this.statsQueue
      })));
    }

    return yield new Promise((resolve, reject) => {
      // create temp folder to save pid files
      fs.access(PID_TEMP_PATH, fs.F_OK, (err) => {
        if (err) {
          // pid temp folder doesn't exist
          fs.mkdirSync(PID_TEMP_PATH);

        }
        resolve();
      });
    });
  }

  startTunnels() {
    logger.prefix = 'Crows Nest';

    return Promise
      .all(this.tunnels.map((tunnel) => {
        return co(function* () {
          yield tunnel.start();
        });
      }))
      .then(() => {
        logger.log('/*************************************************/');
        logger.log('All Sauce Tunnels have been successfully started');
        logger.log('All failover Sauce Tunnels would be automatically restarted');
        logger.log('/*************************************************/');
        return Promise.resolve();
      })
      .catch((err) => {
        logger.warn('/*************************************************/');
        logger.warn('Some tunnels failed in starting');
        logger.warn('All failover Sauce Tunnels would be automatically restarted in next rolling restart');
        logger.warn('/*************************************************/');
        return Promise.reject(err);
      });
  }

  stopTunnels() {
    logger.prefix = 'Crows Nest';

    if (this.statsHandle) {
      // stop draining statsQueue
      clearInterval(this.statsHandle);
    }

    return Promise
      .all(this.tunnels.map((tunnel) => {
        return co(function* () {
          yield tunnel.stop(STATE.QUITTING);
        });
      }))
      .then(() => {
        logger.log('/*************************************************/');
        logger.log('All Sauce Tunnels have been successfully stopped');
        logger.log('/*************************************************/');
        return Promise.resolve();
      })
      .catch((err) => {
        logger.err('Some tunnels failed in stopping');
        return Promise.reject(err);
      });
  }

  supervise() {
    logger.prefix = 'Crows Nest';

    return Promise
      .all(this.tunnels.map((tunnel) => tunnel.monitor()))
      .then(() => Promise.resolve())
      .catch((err) => {
        logger.err(`Some tunnels are wrong \n ${err}`);
        Promise.reject(err);
      });
  }

  scheduleRestart() {
    logger.prefix = 'Crows Nest';
    const self = this;
    // restart all tunnels
    schedule.scheduleJob(this.restartCron, () => {
      logger.log('/-------------------------------------------------/');
      logger.log(`<restarting...> all ${this.tunnelAmount} Sauce Tunnels`);
      logger.log('/-------------------------------------------------/');


      const func = function* () {
        let errCount = 0;

        for (let tunnel of self.tunnels) {
          try {
            yield tunnel.restart();
          } catch (err) {
            logger.err(err);
            errCount++;
          }
        }

        if (errCount === 0) {
          logger.log('/-------------------------------------------------/');
          logger.log(`<restarted> all ${self.tunnelAmount} Sauce Tunnels`);
          logger.log('/-------------------------------------------------/');
        } else {
          logger.warn('/-------------------------------------------------/');
          logger.warn('<restarted> Some tunnels failed in restart');
          logger.warn('They will be restarted in next rolling restart schedule')
          logger.warn('/-------------------------------------------------/');
        }

        return Promise.resolve();
      };

      return co(func);
    });
  }

  stats() {
    logger.prefix = 'Crows Nest';

    let self = this;
    // flush all stats data on a timer
    self.statsHandle = setInterval(() => {
      self.statsQueue
        .drain()
        .then(() => {
          // ignore all errors
          logger.debug('<Drained> stats Queue');
          return Promise.resolve();
        });
    }, 10000);
  }
};

module.exports = Supervisor;