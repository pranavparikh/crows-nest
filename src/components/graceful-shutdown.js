const logger = require('testarmada-logger');

logger.prefix = 'graceful-shutdown';

const shutdown = async tunnel => {
  try {
    logger.log('Disconnecting tunnel', tunnel);
    await tunnel.disconnect();
    logger.log('Successfully disconnected tunnel.  Exit proces');
    process.exit(1);
  } catch (error) {
    logger.err('Failed to shutdown gracefully', error);
    process.exit(1);
  }
};

const gracefulShutdown = tunnel => {
  process.on('uncaughtException', err => {
    logger.err(`Uncaught exception: ${err}`, err);
    shutdown(tunnel);
  }).on('SIGINT', () => {
    logger.log('SIGINT triggered');
    shutdown(tunnel);
  }).on('SIGTERM', () => {
    logger.log('SIGTERM triggered');
    shutdown(tunnel);
  });
};

module.exports = gracefulShutdown;
