'use strict';

const Factory = require('../../src/stats/factory');
const chai = require('chai');
const _ = require('lodash');
const chaiAsPromise = require('chai-as-promised');

chai.use(chaiAsPromise);

const expect = chai.expect;
const assert = chai.assert;

describe('Factory', () => {
  let options = {
    'statsType': 'influxdb',
    'statsHost': '',
    'statsPort': null,
    'statsPrefix': 'testdddtest.',
    'statsDatabase': ''
  };

  it('Valid adaptor name', () => {
    let adaptor = new Factory(options.statsType, options);

    expect(adaptor).to.be.a('Object');
  });

  it('Invalid adaptor name', () => {
    try {
      let adaptor = new Factory('mongodb', options);

    } catch (err) {
      expect(err.message).to.equal('No such stats adaptor found in lib/stats/');
    }
  });

  it('telegraf', () => {
    try {
      let telegrafOptions = {
        'statsType': 'telegraf',
        'statsHost': '',
        'statsPort': null,
        'statsPrefix': 'testdddtest.',
        'statsDatabase': ''
      };

      let adaptor = new Factory(telegrafOptions.statsType, telegrafOptions);

      adaptor.gauge('FAKE_KEY', Date.now(), 1, 'FAKE_TAG')
        .catch(err => assert(false, 'stats failed in telegraf.gauge'));
    } catch (err) {
      expect(err.message).to.equal('No such stats adaptor found in lib/stats/');
    }
  });

});