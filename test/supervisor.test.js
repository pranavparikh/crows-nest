'use strict';

const Supervisor = require('../src/supervisor');
const chai = require('chai');
const co = require('co');
const { delay } = require('../src/util');

const expect = chai.expect;
const assert = chai.assert;

describe('Supervisor', () => {
  it('Initialization', () => {
    let s = new Supervisor({
      config: {
        tunnel: {
          'username': 'fake_name',
          'accessKey': 'fake_key',
          'verbose': false,
          'proxy': null,
          'tunnelIdentifier': 'testfortest',
          'waitTunnelShutdown': true,
          'noRemoveCollidingTunnels': true,
          'sharedTunnel': true,

          'restartCron': '*/2 * * * *'
        },
        supervisor: {
          'portStart': 4000,
          'portIndent': 6
        },
        stats: {
          'statsType': 'influxdb',
          'statsHost': '',
          'statsPort': null,
          'statsPrefix': 'testdddtest.',
          'statsDatabase': ''
        }
      },
      tunnelAmount: 1,
      restartCron: false,
      statsSwitch: true
    });

    expect(s.tunnelAmount).to.equal(1);
    expect(s.restartCron).to.equal(false);
    expect(s.tunnelConfig).to.be.a('object');
    expect(s.tunnelConfig.username).to.equal('fake_name');
    expect(s.tunnelConfig.accessKey).to.equal('fake_key');
    expect(s.tunnelConfig.restartCron).to.equal('*/2 * * * *');
  });

  describe('Stage supervisor', () => {
    describe('Stage one tunnel successfully', () => {
      let s = null;

      before((done) => {
        s = new Supervisor({
          config: {
            tunnel: {
              'username': 'fake_name',
              'accessKey': 'fake_key',
              'verbose': false,
              'proxy': null,
              'tunnelIdentifier': 'testfortest',
              'waitTunnelShutdown': true,
              'noRemoveCollidingTunnels': true,
              'sharedTunnel': true,

              'restartCron': '*/2 * * * *'
            },
            stats: {
              'statsType': 'influxdb',
              'statsHost': '',
              'statsPort': null,
              'statsPrefix': 'testdddtest.',
              'statsDatabase': ''
            },
            supervisor: {
              'portStart': 4000,
              'portIndent': 6
            }
          },
          tunnelAmount: 1,
          statsSwitch: true,
          restartCron: true
        });

        co(function* () {
          yield s.stage();
          done();
        });
      });

      it('Check supervisor', () => {
        // console.log(s)
        expect(s.tunnels).to.be.a('array');
        expect(s.tunnels).to.have.length(1);
      });

      it('Check tunnel', () => {
        expect(s.tunnels[0].state).to.equal(0);
        expect(s.tunnels[0].retried).to.equal(0);
        expect(s.tunnels[0].index).to.equal(1);
        expect(s.tunnels[0].options.username).to.equal('fake_name');
        expect(s.tunnels[0].options.accessKey).to.equal('fake_key');
        expect(s.tunnels[0].options.port).to.equal(4000);
      });
    });

    describe('Stage 10 tunnels successfully', () => {
      let s = null;

      before((done) => {
        s = new Supervisor({
          config: {
            tunnel: {
              'username': 'fake_name',
              'accessKey': 'fake_key',
              'verbose': false,
              'proxy': null,
              'tunnelIdentifier': 'testfortest',
              'waitTunnelShutdown': true,
              'noRemoveCollidingTunnels': true,
              'sharedTunnel': true,

              'restartCron': '*/2 * * * *'
            },
            stats: {
              'statsType': 'influxdb',
              'statsHost': '',
              'statsPort': null,
              'statsPrefix': 'testdddtest.',
              'statsDatabase': ''
            },
            supervisor: {
              'portStart': 4000,
              'portIndent': 5
            }
          },
          tunnelAmount: 10,
          statsSwitch: false,
          restartCron: false
        });

        co(function* () {
          yield s.stage();
          done();
        });
      });

      it('Check supervisor', () => {
        expect(s.tunnelAmount).to.equal(10);
        expect(s.tunnels).to.be.a('array');
        expect(s.tunnels).to.have.length(10);
      });

      it('Check tunnels', () => {
        expect(s.tunnels[0].state).to.equal(0);
        expect(s.tunnels[0].retried).to.equal(0);
        expect(s.tunnels[0].index).to.equal(1);
        expect(s.tunnels[0].options.port).to.equal(4000);

        expect(s.tunnels[5].state).to.equal(0);
        expect(s.tunnels[5].retried).to.equal(0);
        expect(s.tunnels[5].index).to.equal(6);
        expect(s.tunnels[5].options.port).to.equal(4025);
      });
    });
  });

  describe('Start tunnels', () => {
    let s = null;

    before((done) => {
      s = new Supervisor({
        tunnelAmount: 3,
        config: {
          tunnel: {
            'username': 'fake_name',
            'accessKey': 'fake_key',
            'verbose': false,
            'proxy': null,
            'tunnelIdentifier': 'testfortest',
            'waitTunnelShutdown': true,
            'noRemoveCollidingTunnels': true,
            'sharedTunnel': true,

            'restartCron': '*/2 * * * *'
          },
          supervisor: {
            'portStart': 4000,
            'portIndent': 6
          }
        },
        restartCron: false
      });

      co(function* () {
        yield s.stage();
        done();
      });
    });

    it('All tunnels start successfully', (done) => {
      for (let i = 0; i < s.tunnels.length; i++) {
        s.tunnels[i].start = () => Promise.resolve();
      }

      co(function* () {
        try {
          yield s.startTunnels();
        } catch (err) {
          assert(false, 'One of the tunnel failed in starting');
        } finally {
          done();
        }
      });

    });

    it('All tunnels fail in starting', (done) => {
      for (let i = 0; i < s.tunnels.length; i++) {
        s.tunnels[i].start = () => Promise.reject();
      }

      co(function* () {
        try {
          yield s.startTunnels();
          assert(false, 'One of the tunnel succeeded in starting');
        } catch (err) {
        } finally {
          done();
        }
      });

    });

    it('One tunnel fails in starting', (done) => {
      s.tunnels[0].start = () => Promise.resolve();
      s.tunnels[1].start = () => Promise.reject();
      s.tunnels[2].start = () => Promise.resolve();

      co(function* () {
        try {
          yield s.startTunnels();
          assert(false, 'One of the tunnel succeeded in starting');
        } catch (err) {
        } finally {
          done();
        }
      });

    });

    it('More tunnels fail in starting', (done) => {
      s.tunnels[0].start = () => Promise.resolve();
      s.tunnels[1].start = () => Promise.reject();
      s.tunnels[2].start = () => Promise.reject();

      co(function* () {
        try {
          yield s.startTunnels();
          assert(false, 'One of the tunnel succeeded in starting');
        } catch (err) {
        } finally {
          done();
        }
      });
    });
  });

  describe('Stop tunnels', () => {
    let s = null;

    before((done) => {
      s = new Supervisor({
        tunnelAmount: 3,
        config: {
          tunnel: {
            'username': 'fake_name',
            'accessKey': 'fake_key',
            'verbose': false,
            'proxy': null,
            'tunnelIdentifier': 'testfortest',
            'waitTunnelShutdown': true,
            'noRemoveCollidingTunnels': true,
            'sharedTunnel': true,

            'restartCron': '*/2 * * * *'
          },
          supervisor: {
            'portStart': 4000,
            'portIndent': 6
          },
          stats: {
            'statsType': 'influxdb',
            'statsHost': '',
            'statsPort': null,
            'statsPrefix': 'testdddtest.',
            'statsDatabase': ''
          }
        },
        restartCron: false,
        statsSwitch: true,
      });

      co(function* () {
        yield s.stage();
        done();
      });
    });

    it('All tunnels stop successfully', (done) => {
      for (let i = 0; i < s.tunnels.length; i++) {
        s.tunnels[i].stop = () => Promise.resolve();
      }

      co(function* () {
        try {
          yield s.stopTunnels();
        } catch (err) {
          assert(false, 'One of the tunnel failed in failing');
        } finally {
          done();
        }
      });

    });

    it('At least 1 tunnel fails in stopping', (done) => {
      for (let i = 0; i < s.tunnels.length; i++) {
        s.tunnels[i].stop = () => Promise.resolve();
      }

      s.tunnels[s.tunnels.length - 1].stop = () => Promise.reject('FAKE_TUNNEL_ERR_6');

      co(function* () {
        try {
          yield s.stopTunnels();
          assert(false, 'All tunnels stop successfully');
        } catch (err) {
        } finally {
          done();
        }
      });

    });
  });

  describe('Stats', function () {
    this.timeout(60000);

    it('Stats is enabled with valid adaptor', () => {
      let s = new Supervisor({
        config: {
          tunnel: {
            'username': 'fake_name',
            'accessKey': 'fake_key',
            'verbose': false,
            'proxy': null,
            'tunnelIdentifier': 'testfortest',
            'waitTunnelShutdown': true,
            'noRemoveCollidingTunnels': true,
            'sharedTunnel': true,

            'restartCron': '*/2 * * * *'
          },
          supervisor: {
            'portStart': 4000,
            'portIndent': 6
          },
          stats: {
            'statsType': 'influxdb',
            'statsHost': '',
            'statsPort': null,
            'statsPrefix': 'testdddtest.',
            'statsDatabase': ''
          }
        },
        tunnelAmount: 3,
        statsSwitch: true,
        restartCron: false
      });

      assert(true, 'Stats is enabled with valid adaptor');
    });

    it('Stats is enabled with invalid adaptor', () => {
      try {
        let s = new Supervisor({
          config: {
            tunnel: {
              'username': 'fake_name',
              'accessKey': 'fake_key',
              'verbose': false,
              'proxy': null,
              'tunnelIdentifier': 'testfortest',
              'waitTunnelShutdown': true,
              'noRemoveCollidingTunnels': true,
              'sharedTunnel': true,

              'restartCron': '*/2 * * * *'
            },
            supervisor: {
              'portStart': 4000,
              'portIndent': 6
            },
            stats: {
              'statsType': 'mongodb',
              'statsHost': '',
              'statsPort': null,
              'statsPrefix': 'testdddtest.',
              'statsDatabase': ''
            }
          },
          tunnelAmount: 3,
          statsSwitch: true,
          restartCron: false
        });

        assert(false, 'Stats is enabled with invalid adaptor')
      } catch (err) {
        expect(err.message).to.equal('No such stats adaptor found in lib/stats/');
      }
    });

    it('Stats is disabled with invalid adaptor', () => {
      try {
        let s = new Supervisor({
          config: {
            tunnel: {
              'username': 'fake_name',
              'accessKey': 'fake_key',
              'verbose': false,
              'proxy': null,
              'tunnelIdentifier': 'testfortest',
              'waitTunnelShutdown': true,
              'noRemoveCollidingTunnels': true,
              'sharedTunnel': true,

              'restartCron': '*/2 * * * *'
            },
            supervisor: {
              'portStart': 4000,
              'portIndent': 6
            },

            stats: {
              'statsType': 'mongodb',
              'statsHost': '',
              'statsPort': null,
              'statsPrefix': 'testdddtest.',
              'statsDatabase': ''
            },
          },
          tunnelAmount: 3,
          statsSwitch: false,
          restartCron: false
        });

        assert(true, 'Stats is disabled with invalid adaptor')
      } catch (err) {
        assert(false, 'Stats is enabled with invalid adaptor')
      }
    });

    it('Run with stats enabled', (done) => {
      let s = new Supervisor({
        config: {
          tunnel: {
            'username': 'fake_name',
            'accessKey': 'fake_key',
            'verbose': false,
            'proxy': null,
            'tunnelIdentifier': 'testfortest',
            'waitTunnelShutdown': true,
            'noRemoveCollidingTunnels': true,
            'sharedTunnel': true,

            'restartCron': '*/2 * * * *'
          },
          supervisor: {
            'portStart': 4000,
            'portIndent': 6
          },

          stats: {
            'statsType': 'telegraf',
            'statsHost': '',
            'statsPort': null,
            'statsPrefix': 'testdddtest.',
            'statsDatabase': ''
          },
        },
        tunnelAmount: 3,
        statsSwitch: true,
        restartCron: false
      });

      co(function* () {
        s.stats();
        yield delay(15000);
        done();
      });
    });
  });
});