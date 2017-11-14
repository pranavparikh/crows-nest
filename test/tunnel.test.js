'use strict';

const { STATE, Tunnel } = require('../src/tunnel');
const { EVENT, StatsQueue } = require('../src/stats');
const chai = require('chai');
const co = require('co');
const _ = require('lodash');

const expect = chai.expect;
const assert = chai.assert;

describe('Tunnel', () => {
  let sauceConnectLauncherMock = null;
  let saucelabsApiMock = null;
  let statsMock = { gauge(stat, data, tags) { } };
  let statsQueue = {};

  let options = {
    username: 'fake_name',
    accessKey: 'fake_key',
    verbose: false,
    proxy: null,
    tunnelIdentifier: 'testfortest',
    waitTunnelShutdown: true,
    noRemoveCollidingTunnels: true,
    sharedTunnel: true,
    restartCron: '*/2 * * * *',
    id: 1,
    port: 4000,
    pidTempPath: 'temp'
  };

  let t = null;

  beforeEach(() => {
    sauceConnectLauncherMock = (options, cb) => {
      cb(null, { '_handle': {}, close(cb) { cb() } });
    };

    statsQueue = new StatsQueue({
      statsSwitch: true,
      statsType: 'influxdb',
      statsHost: 'some.where.local.org',
      statsPort: null,
      statsPrefix: 'fake.',
      statsDatabase: '',
      stats: statsMock
    });

    saucelabsApiMock = { deleteTunnel(id, cb) { cb(null, 'fake res') } };

    t = new Tunnel(_.extend({}, options, {
      sauceConnectLauncher: sauceConnectLauncherMock,
      saucelabsApi: saucelabsApiMock,
      statsQueue: statsQueue
    }));
  });

  it('Initialization', () => {
    expect(t.state).to.equal(STATE.IDLE);
    expect(t.retried).to.equal(0);
    expect(t.index).to.equal(1);
    expect(t.options).to.not.have.property('restartCron');
  });

  describe('Launch', function () {
    this.timeout(60000);

    it('timeout', (done) => {
      t.sauceConnectLauncher = (options, cb) => {
        setTimeout(() => {
          cb(null, { close(cb) { cb() } });
        }, 10000);
      };

      co(function* () {
        try {
          yield t.launch(1000);
        } catch (err) {
          expect(err.stack).to.have.string('TimeoutError');
        } finally {
          done();
        }
      });
    });
  });

  describe('Start tunnel', function () {
    this.timeout(60000);

    it('Straight succeed', (done) => {
      co(function* () {
        try {
          yield t.start()
          expect(t.state).to.equal(STATE.RUNNING);
        } catch (err) {
          assert(false, 'Tunnel failed in launching up');
        } finally {
          done();
        }
      });
    });

    it('Succeed with retry', (done) => {
      let count = 0;

      t.sauceConnectLauncher = (options, cb) => {
        count++;
        if (count < 5) {
          cb(new Error('fake error'), null);
        } else {
          cb(null, { close(cb) { cb() } });
        }
      };

      co(function* () {
        try {
          yield t.start();
          expect(t.state).to.equal(STATE.RUNNING)
          expect(_.values(t.statsQueue.statsQueue[EVENT.TUNNEL_RETRYING]).length).to.equal(1);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_RETRYING]['1'].event.data).to.equal(3);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_RETRYING]['1'].event.eventType).to.equal(EVENT.TUNNEL_RETRYING);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_RETRYING]['1'].event.tunnelIndex).to.equal(1);
          expect(_.values(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]).length).to.equal(1);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]['1'].event.data).to.equal(4);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]['1'].event.eventType).to.equal(EVENT.TUNNEL_CONNECTED);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]['1'].event.tunnelIndex).to.equal(1);
          expect(_.values(t.statsQueue.statsQueue[EVENT.TUNNEL_BUILD_CONNECTITON]).length).to.equal(1);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_BUILD_CONNECTITON]['1'].event.eventType).to.equal(EVENT.TUNNEL_BUILD_CONNECTITON);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_BUILD_CONNECTITON]['1'].event.tunnelIndex).to.equal(1);
        } catch (err) {
          assert(false, 'Tunnel failed in launching up with retry ' + err);
        } finally {
          done();
        }
      });

    });

    it('Fail after 10 retries', (done) => {
      t.sauceConnectLauncher = (options, cb) => { cb(new Error('fake_err'), null); };

      co(function* () {
        try {
          yield t.start();
          assert(false, 'Tunnel succeeded in launching up');
          expect(t.state).to.equal(STATE.IDLE);
        } catch (err) {

        } finally {
          done();
        }
      });
    });

    it('Skip starting if state isn\'t IDLE', (done) => {
      t.state = STATE.STARTING;

      co(function* () {
        try {
          yield t.start();
        } catch (err) {
          assert(false, 'Tunnel succeeded in launching up with state = IDLE');
        } finally {
          done();
        }
      });

    });

    it('Stats works', (done) => {

      co(function* () {
        try {
          yield t.start();
          expect(_.values(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]).length).to.equal(1);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]['1'].event.data).to.equal(0);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]['1'].event.eventType).to.equal(EVENT.TUNNEL_CONNECTED);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_CONNECTED]['1'].event.tunnelIndex).to.equal(1);
          expect(_.values(t.statsQueue.statsQueue[EVENT.TUNNEL_BUILD_CONNECTITON]).length).to.equal(1);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_BUILD_CONNECTITON]['1'].event.eventType).to.equal(EVENT.TUNNEL_BUILD_CONNECTITON);
          expect(t.statsQueue.statsQueue[EVENT.TUNNEL_BUILD_CONNECTITON]['1'].event.tunnelIndex).to.equal(1);
        } catch (err) {
          assert(false, `Stats isn\'t pushed correctly during start ${err}`);
        } finally {
          done();
        }
      });

    });

  });

  describe('Stop tunnel', function () {
    this.timeout(60000);

    beforeEach((done) => {
      co(function* () {
        try {
          yield t.start();
        } catch (err) {
          assert(false, 'Tunnel failed in launching up');
        } finally {
          done();
        }
      });
    });

    it('Straight success', (done) => {
      co(function* () {
        try {
          yield t.stop();
          expect(t.state).to.equal(STATE.IDLE);
        } catch (err) {
          assert(false, 'Tunnel failed in stop');
        } finally {
          done();
        }
      });
    });

    it('Return success if tunnel died', (done) => {
      t.tunnelProcess = null;

      co(function* () {
        try {
          yield t.stop();
          expect(t.state).to.equal(STATE.IDLE);
        } catch (err) {
          assert(false, 'Tunnel is still alive');
        } finally {
          done();
        }
      });

    });

    it('Skip stopping if state is IDLE', (done) => {
      t.state = STATE.IDLE;

      co(function* () {
        try {
          yield t.stop();
          expect(t.state).to.equal(STATE.IDLE);
        } catch (err) {
          assert(false, 'Tunnel is still alive');
        } finally {
          done();
        }
      });
    });

    it('Skip stopping if state is STOPPING', (done) => {
      t.state = STATE.STOPPING;

      co(function* () {
        try {
          yield t.stop();
          expect(t.state).to.equal(STATE.STOPPING);
        } catch (err) {
          assert(false, `Tunnel is still alive ${err}`);
        } finally {
          done();
        }
      });

    });

    it('Skip stopping if state is QUITTING', (done) => {
      t.state = STATE.QUITTING;

      co(function* () {
        try {
          yield t.stop();
          expect(t.state).to.equal(STATE.QUITTING);
        } catch (err) {
          assert(false, 'Tunnel is still alive');
        } finally {
          done();
        }
      });

    });

    describe('Kill tunnel', () => {
      it('Kill successfully', (done) => {
        t.treeKill = (pid, signal, cb) => { cb() };

        co(function* () {
          try {
            yield t.kill();
            expect(t.state).to.equal(STATE.IDLE);
          } catch (err) {
            assert(false, 'Tunnel is killed');
          } finally {
            done();
          }
        });
      });

      it('Fail in kill', (done) => {
        t.treeKill = (pid, signal, cb) => { cb('fake_err') };

        co(function* () {
          try {
            yield t.kill();
            assert(false, 'Tunnel is killed')
          } catch (err) {
            expect(t.state).to.equal(STATE.RUNNING);
          } finally {
            done();
          }
        });

      });

      it('Stats works if stop doesnt succeed', (done) => {
        t.tunnelProcess = { id: 1 };
        t.treeKill = (pid, signal, cb) => { cb() };

        t.state = STATE.RUNNING;

        co(function* () {
          try {
            yield t.kill();
            expect(_.values(t.statsQueue.statsQueue[EVENT.TUNNEL_STOPPED]).length).to.equal(1);
            expect(t.statsQueue.statsQueue[EVENT.TUNNEL_STOPPED]['1'].event.data).to.equal(1);
            expect(t.statsQueue.statsQueue[EVENT.TUNNEL_STOPPED]['1'].event.eventType).to.equal(EVENT.TUNNEL_STOPPED);
            expect(t.statsQueue.statsQueue[EVENT.TUNNEL_STOPPED]['1'].event.tunnelIndex).to.equal(1);
          } catch (err) {
            assert(false, `Stats isn't pushed correctly during start ${err}`)
          } finally {
            done();
          }
        });

      });
    });
  });

  describe('Restart tunnel', function () {
    this.timeout(60000);

    beforeEach((done) => {
      co(function* () {
        try {
          yield t.start()
        } catch (err) {
          assert(false, 'Tunnel isn\'t started')
        } finally {
          done();
        }
      });
    });

    it('Straight success', (done) => {
      co(function* () {
        try {
          yield t.restart();
          expect(t.state).to.equal(STATE.RUNNING);
        } catch (err) {
          assert(false, 'Tunnel isn\'t restarted');
        } finally {
          done();
        }
      });
    });

    it('Fails in starting', (done) => {
      t.start = () => Promise.reject('FAKE_ERR');

      co(function* () {
        try {
          yield t.restart();
          assert(false, 'Tunnel shouldn\'t be restarted');
        } catch (err) {
          expect(t.state).to.equal(STATE.IDLE);
        } finally {
          done();
        }
      });
    });

    it('Do nothing if state is STARTING', (done) => {
      t.state = STATE.STARTING;

      co(function* () {
        try {
          yield t.restart();
          expect(t.state).to.equal(STATE.STARTING);
        } catch (err) {
          assert(false, 'Tunnel isn\'t restarted');
        } finally {
          done();
        }
      });
    });

    it('Do nothing if state is STOPPING', (done) => {
      t.state = STATE.STOPPING;

      co(function* () {
        try {
          yield t.restart();
          expect(t.state).to.equal(STATE.STOPPING);
        } catch (err) {
          assert(false, 'Tunnel isn\'t restarted');
        } finally {
          done();
        }
      });
    });

  });
});