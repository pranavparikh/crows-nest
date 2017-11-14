'use strict';

const path = require('path');
const once = require('once');
const argvs = require('yargs');
const co = require('co');

const logger = require('testarmada-logger');
const Supervisor = require('./supervisor');
const { delay } = require('./util');

const argv = argvs.usage('Usage: node ./bin/supervise [options]')
  .option('tunnels', {
    alias: 't',
    describe: 'How many sauce tunnels would be open',
    number: true
  })
  .option('rollingRestart', {
    alias: 'r',
    describe: 'Enable rolling restart feature',
    boolean: true
  })
  .option('stats', {
    alias: 's',
    describe: 'Enable stats feature, stats data will send to config.statsdHost',
    boolean: true
  })
  .option('debug', {
    describe: 'Enable debug mode',
    boolean: true
  })
  .option('config', {
    alias: 'c',
    describe: 'Specify sauce tunnel configuration location',
    string: true
  })
  .help('h')
  .alias('h', 'help')
  .argv;

const tunnels = argv.tunnels || 1;
const rollingRestart = !!argv.rollingRestart;
// load config from given path 
const configPath = argv.config ? path.resolve(process.cwd(), argv.config) : '../config.json';
const config = require(configPath);
// only set restartCron when rollingRestart is enabled 
const restartCron = rollingRestart ? config.restartCron || '0 2 * * *' : null;

// stats
const stats = !!argv.stats;

const supervisor = new Supervisor({
  config,
  tunnelAmount: tunnels,
  restartCron,
  statsSwitch: stats
});

const exitProcess = once((signal) => {
  logger.prefix = 'Crows Nest';

  logger.warn(`Received ${signal}. Stopping all Sauce Tunnels and Existing.`);

  co(function* () {
    yield supervisor.stopTunnels();
    process.exit(0);
  })
});

co(function* () {
  try {
    yield delay(500);
    yield supervisor.stage();
    yield supervisor.startTunnels();

  } catch (err) {
    logger.prefix = 'Crows Nest';
    logger.err(err);
  } finally {
    process.on('SIGINT', () => exitProcess('SIGINT'));
    process.on('SIGTERM', () => exitProcess('SIGTERM'));

    if (rollingRestart) {
      supervisor.scheduleRestart();
    }

    if (stats) {
      supervisor.stats();
    }

    supervisor.supervise();
  }
});
