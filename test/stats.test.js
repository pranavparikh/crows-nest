'use strict';

const { EVENT, StatsQueue } = require('../src/stats');
const chai = require('chai');
const chaiAsPromise = require('chai-as-promised');

const _ = require('lodash');

chai.use(chaiAsPromise);

const expect = chai.expect;
const assert = chai.assert;

describe('Stats', () => {
  let statsMock = null;

  let options = {
    statsSwitch: false,
    statsHost: 'some.where.local.org',
    statsPort: null,
    statsPrefix: 'fake.'
  };

  let s = null;

  beforeEach(() => {
    statsMock = { gauge(key, timestamp, data, tags, callback) { return Promise.resolve() } };

    s = new StatsQueue(_.extend({}, options, { statsClient: statsMock }));
  });

  it('Initialization', () => {
    expect(s.statsSwitch).to.equal(options.statsSwitch);
    expect(s.statsPrefix).to.equal(options.statsPrefix);
  });

  it('Build empty queue', () => {
    let q = s.build();

    _.forEach(EVENT, (v, k) => {
      expect(q).to.have.property(v);
    });
  });

  describe('Push event', () => {
    it('Switch is off', () => {
      s.statsSwitch = false;

      s.push({
        eventType: EVENT.TUNNEL_STATUS,
        timestamp: 123123123,
        tunnelIndex: 1,
        data: 1
      });

      expect(_.values(s.statsQueue[EVENT.TUNNEL_STATUS]).length).to.equal(0);

    });
    describe('Switch is on', () => {
      beforeEach(() => {
        s.statsSwitch = true;
      });

      it('First event of its kind', () => {

        s.push({
          eventType: EVENT.TUNNEL_STATUS,
          timestamp: 123123123,
          tunnelIndex: '1',
          data: 999
        });
        expect(_.values(s.statsQueue[EVENT.TUNNEL_STATUS]).length).to.equal(1);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].timestamp).to.equal(123123123);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.data).to.equal(999);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.eventType).to.equal(EVENT.TUNNEL_STATUS);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.tunnelIndex).to.equal('1');
      });

      it('Latest event of its kind', () => {

        s.push({
          eventType: EVENT.TUNNEL_STATUS,
          timestamp: 123123123,
          tunnelIndex: '1',
          data: 999
        });
        s.push({
          eventType: EVENT.TUNNEL_STATUS,
          timestamp: 123123125,
          tunnelIndex: '1',
          data: 888
        });
        expect(_.values(s.statsQueue[EVENT.TUNNEL_STATUS]).length).to.equal(1);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].timestamp).to.equal(123123125);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.data).to.equal(888);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.eventType).to.equal(EVENT.TUNNEL_STATUS);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.tunnelIndex).to.equal('1');
      });

      it('Not latest event of its kind', () => {

        s.push({
          eventType: EVENT.TUNNEL_STATUS,
          timestamp: 123123123,
          tunnelIndex: '1',
          data: 999
        });
        s.push({
          eventType: EVENT.TUNNEL_STATUS,
          timestamp: 123123120,
          tunnelIndex: '1',
          data: 888
        });
        expect(_.values(s.statsQueue[EVENT.TUNNEL_STATUS]).length).to.equal(1);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].timestamp).to.equal(123123123);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.data).to.equal(999);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.eventType).to.equal(EVENT.TUNNEL_STATUS);
        expect(s.statsQueue[EVENT.TUNNEL_STATUS]['1'].event.tunnelIndex).to.equal('1');
      });

      it('Event type isn\'t allowed', () => {

        s.push({
          eventType: 'some_random_event',
          timestamp: 123123123,
          tunnelIndex: '1',
          data: 999
        });
        expect(_.values(s.statsQueue[EVENT.TUNNEL_STATUS]).length).to.equal(0);
      });
    });
  });

  describe('Drain events', () => {
    beforeEach(() => {
      s.statsSwitch = true;
    });

    it('Queue is empty', () => {
      return s
        .drain()
        .then(() => expect(Promise.resolve(_.values(s.statsQueue[EVENT.TUNNEL_STATUS]).length)).to.eventually.equal(0))
        .catch(err => assert(false, 'statsQueue isn\'t drained completely'));
    });

    it('Queue isn\'t empty', () => {

      s.push({
        eventType: EVENT.TUNNEL_STATUS,
        timestamp: 123123123,
        tunnelIndex: '1',
        data: 999
      });
      s.drain()
        .then(() => expect(Promise.resolve(_.values(s.statsQueue[EVENT.TUNNEL_STATUS]).length)).to.eventually.equal(0))
        .catch(err => assert(false, 'statsQueue isn\'t drained completely'));
    });
  });
});