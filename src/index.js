const logger = require('testarmada-logger');

const config = require('./config');
const gracefulShutdown = require('./components/graceful-shutdown');
const { heartbeat } = require('./components/monitor');
const Tunnel = require('./components/tunnel');

logger.prefix = 'ravens';

const start = async () => {
  try {
    logger.log('Initializing crows nest instance');
    const tunnel = new Tunnel(config.tunnel);

    logger.log('Connecting to sauce connect');
    await tunnel.connect();
    logger.log(`Connected to Sauce Labs with tunnel id: ${tunnel.connection.tunnelId}`);


    logger.log(`Setting heartbeat interval at: ${config.heartbeatInterval}`);
    heartbeat(tunnel, config.heartbeatInterval);

    logger.log('Initializing graceful shutdown');
    gracefulShutdown(tunnel);
  } catch (error) {
    logger.err('Failed to start Sauce Connect tunnel.  Exit the process.', error);
    process.exit(1);
  }
};

start();
