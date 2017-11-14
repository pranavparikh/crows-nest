'use strict';

const sauceConnectLauncher = require('sauce-connect-launcher');
const saucelabsApi = require('saucelabs');
const treeKill = require('tree-kill');
const _ = require('lodash');
const path = require('path');
const moment = require('moment');
const co = require('co');

const logger = require('testarmada-logger');
const EVENT = require('./stats').EVENT;
const { delay } = require('./util');

const privateOptions = Array.of('id', 'pidTempPath', 'restartCron', 'statsQueue');

// frequency to check if a tunnel is alive in millisecond
const MONITOR_INTERVAL = 10000;
const DELAY_INTERVAL = 5000;
// maximum retry times before a tunnel goes alive in millisecond
const RETRY_LIMIT = 10;
// maximum duration for a live tunnel in millisecond
const TUNNEL_STOP_TIMEOUT = 480000;
const TUNNEL_START_TIMEOUT = 480000;

const STATE = {
  IDLE: 0, STARTING: 1, RUNNING: 2, STOPPING: 3, QUITTING: 4
};

class TimeoutError extends Error {
  constructor(...params) {
    super(...params);
  }
};

class Tunnel {
  constructor(options) {
    this.state = STATE.IDLE;
    this.retried = 0;

    this.tunnelProcess = null;
    this.index = options.id;
    this.pidTempPath = options.pidTempPath;
    this.startedAt = null;
    this.startedFrom = null;
    this.statsQueue = options.statsQueue;

    this.options = _.omit(options, privateOptions);

    // add individual info per tunnel
    this.options.readyFileId = `${Math.ceil(Math.random() * 1000)}_${this.index.toString()}`;
    this.options.pidfile = path.resolve(this.pidTempPath, `${options.tunnelIdentifier}_${this.index.toString()}.pid`);

    this.sauceConnectLauncher = options.sauceConnectLauncher ? options.sauceConnectLauncher : sauceConnectLauncher;
    this.saucelabsApi = options.saucelabsApi ? options.saucelabsApi : saucelabsApi;
    this.treeKill = options.treeKill ? options.treeKill : treeKill;
  }

  launch(timeout) {
    const timeoutThreshold = timeout ? timeout : TUNNEL_START_TIMEOUT;

    return new Promise((resolve, reject) => {

      const timeout = setTimeout(() => {
        this.state = STATE.IDLE;
        logger.err(`Sauce Tunnel #${this.index} times out while starting`);
        reject(new TimeoutError(
          `Sauce Tunnel #${this.index} isn't started `
          + `in ${moment.duration(timeoutThreshold).humanize()}!`
        ));
      }, timeoutThreshold);

      logger.log(`<starting...> Sauce Tunnel #${this.index}`);
      logger.debug(`<starting...> Sauce Tunnel #${this.index} with option ${JSON.stringify(this.options)}`);

      this.sauceConnectLauncher(this.options, (err, sauceConnectProcess) => {
        clearTimeout(timeout);

        if (err) {
          reject(err);
        } else {
          resolve(sauceConnectProcess);
        }
      });
    });
  }

  * start(retries = 0) {
    logger.prefix = 'Crows Nest';
    // let self = this;

    if (this.state !== STATE.IDLE) {
      // this.stop method is called somewhere, we do stop first. we'll restart the tunnel in next scheduled time slot
      logger.warn(`Sauce Tunnel #${this.index} isn't idle, it's doing things`);
      return Promise.resolve();
    } else {
      // restarting
      this.state = STATE.STARTING;
      this.tunnelProcess = null;
      if (!this.startedFrom) {
        this.startedFrom = moment().valueOf();
      }

      // to avoid the blast of all tunnels launch up at same time
      yield delay(Math.floor(Math.random() * DELAY_INTERVAL));

      for (let i = 0; i < RETRY_LIMIT; i++) {
        try {
          const sauceConnectProcess = yield this.launch();
          this.tunnelProcess = sauceConnectProcess;
          // in case tunnelProcess turns null mysteriously 
          this.tunnelId = this.tunnelProcess.tunnelId;
          logger.log(`<started> Sauce Tunnel #${this.index} (${this.tunnelProcess.tunnelId})`);
          this.startedAt = moment().valueOf();
          this.state = STATE.RUNNING;

          this.statsQueue
            .push({
              eventType: EVENT.TUNNEL_CONNECTED,
              timestamp: moment().valueOf(),
              tunnelIndex: this.index,
              data: i
            });

          this.statsQueue.push({
            eventType: EVENT.TUNNEL_BUILD_CONNECTITON,
            timestamp: moment().valueOf(),
            tunnelIndex: this.index,
            data: !!this.startedFrom ? moment().valueOf() - this.startedFrom : 0
          });

          return Promise.resolve();
        } catch (err) {

          logger.err(`Error in starting Sauce Tunnel #${this.index} \n ${err}`);
          logger.warn(`<Attempt ${i}/${RETRY_LIMIT} starting...> Sauce Tunnel #${this.index} still isn't started`);

          this.retried = i;
          this.state = STATE.IDLE;

          this.statsQueue.push({
            eventType: EVENT.TUNNEL_RETRYING,
            timestamp: moment().valueOf(),
            tunnelIndex: this.index,
            data: i
          });
        }
      }

      this.state = STATE.IDLE;

      this.statsQueue.push({
        eventType: EVENT.TUNNEL_FAILED,
        timestamp: moment().valueOf(),
        tunnelIndex: this.index,
        data: RETRY_LIMIT
      });

      return Promise.reject(new TimeoutError(
        `Sauce Tunnel #${this.index} isn't started `
        + `in ${moment.duration(TUNNEL_START_TIMEOUT).humanize()}!`
      ));
    }
  }

  * stop(currentState = STATE.STOPPING) {
    logger.prefix = 'Crows Nest';

    if (this.state === STATE.IDLE
      || this.state === STATE.STOPPING
      || this.state === STATE.QUITTING) {
      // dont do anything here
      return Promise.resolve();
    } else {
      this.state = currentState;
      this.startedFrom = null;

      // to avoid the blast of terminating all tunnels at same time
      yield delay(Math.floor(Math.random() * DELAY_INTERVAL));

      try {

        return yield new Promise((resolve, reject) => {

          const timeout = setTimeout(() => {
            logger.err(`Sauce Tunnel #${this.index} times out while stopping`);

            return reject(new TimeoutError(
              `Sauce Tunnel #${this.index} isn't stopped `
              + `in ${moment.duration(TUNNEL_STOP_TIMEOUT).humanize()}!`
            ));
          }, TUNNEL_STOP_TIMEOUT);

          // since tunnelProcess.close() gives nothing back, we don't know if tunnel is closed succesfully or not.
          // we always return resolve, leave other situation for kill()
          if (this.tunnelProcess && this.tunnelProcess['_handle']) {

            logger.log(`<stopping...> Sauce Tunnel #${this.index}`);
            // tunnel is alive
            this.tunnelProcess.close(() => {
              clearTimeout(timeout);
              // where zombie tunnel is born
              logger.log(`<stopped> Sauce Tunnel #${this.index}`);

              // _handle is null, tunnel is terminated correctly, or tunnel child_process is set to be null
              if (this.state !== STATE.QUITTING) {
                this.state = STATE.IDLE;
              }

              this.statsQueue.push({
                eventType: EVENT.TUNNEL_STOPPED,
                timestamp: moment().valueOf(),
                tunnelIndex: this.index,
                data: this.state === STATE.IDLE ? 1 : 0
              })

              return resolve();
            });
          } else {
            clearTimeout(timeout);
            if (this.state !== STATE.QUITTING) {
              this.state = STATE.IDLE;
            }

            this.statsQueue.push({
              eventType: EVENT.TUNNEL_STOPPED,
              timestamp: moment().valueOf(),
              tunnelIndex: this.index,
              data: this.state === STATE.IDLE ? 1 : 0
            })

            // one extra step is needed
            logger.warn(`Sauce Tunnel #${this.index} doesn't exist or is safely closed, returning`);
            return resolve();
          }
        });

      } catch (err) {
        logger.err(err);
        // tunnel times out in stopping itself
        return yield this.kill();
      }
    }
  }

  * kill() {
    logger.prefix = 'Crows Nest';
    this.startedAt = null;

    // something happened to stop current tunnel from being terminated
    logger.warn(`<killing with SIGKILL...> Sauce Tunnel #${this.index}`);
    yield new Promise((resolve, reject) => {
      this.saucelabsApi.deleteTunnel(this.tunnelId, (err, res) => {
        // we eat err here
        resolve();
      })
    });

    yield new Promise((resolve, reject) => {
      this.treeKill(this.tunnelProcess.pid, 'SIGKILL', (err) => {
        if (err) {
          this.state = STATE.RUNNING;
          logger.err(`Kill sauce Tunnel #${this.index} failed\n${err}`);
          reject(err);
        } else {
          this.state = STATE.IDLE;
          this.tunnelProcess = null;
          logger.warn(`<killed with SIGKILL> Sauce Tunnel #${this.index}!`);
          resolve();
        }
      });
    });

    this.statsQueue.push({
      eventType: EVENT.TUNNEL_STOPPED,
      timestamp: moment().valueOf(),
      tunnelIndex: this.index,
      data: this.state === STATE.IDLE ? 1 : 0
    });

    return Promise.resolve();
  }

  * restart() {
    logger.prefix = 'Crows Nest';

    if (this.state === STATE.IDLE
      || this.state === STATE.RUNNING) {
      // restart is only allowed on idle or running state
      try {
        yield delay(Math.floor(Math.random() * DELAY_INTERVAL));
        yield this.stop();
        yield this.start();

        this.state = STATE.RUNNING;
        return Promise.resolve();
      } catch (err) {
        // start is skipped if a tunnel times out in stopping.
        // it will be restarted in next scheduled restart
        logger.err(`${err}`);
        return Promise.reject();
      }
    } else {
      // restart procedure is under going, do nothing 
      return Promise.resolve();
    }
  }

  monitor() {
    logger.prefix = 'Crows Nest';
    const self = this;

    this.statsQueue.push({
      eventType: EVENT.TUNNEL_STATUS,
      timestamp: moment().valueOf(),
      tunnelIndex: this.index,
      data: this.state === STATE.RUNNING ? 1 : 0
    });

    this.statsQueue.push({
      eventType: EVENT.TUNNEL_AGE,
      timestamp: moment().valueOf(),
      tunnelIndex: this.index,
      data: !!this.startedAt ? moment().valueOf() - this.startedAt : 0
    });

    this.retried = 0;

    if ((this.tunnelProcess && this.tunnelProcess['_handle'])
      || this.state === STATE.STOPPING
      || this.state === STATE.STARTING
      || this.state === STATE.QUITTING) {
      //child process is still alive

      return co(function* () {
        yield delay(MONITOR_INTERVAL);
        return self.monitor();
      });

    } else {
      logger.warn(`Sauce Tunnel #${this.index} is dead, restarting it`);

      return co(function* () {
        yield self.restart();
        return self.monitor();
      });
    }
  }
};

module.exports = {
  STATE,
  Tunnel
};