const logger = require('testarmada-logger');
const fs = require('fs');
const schedule = require('node-schedule');
const { promisify } = require('util');

const config = require('../../config');

logger.prefix = 'Monitor';

const parseData = tunnels => {
  try {
    return JSON.parse(tunnels);
  } catch (error) {
    logger.err('Failed to parse data', error);
    throw error;
  }
};

const getActiveTunnels = async () => {
  try {
    logger.debug(`Getting active tunnels from file ${config.activeTunnelsFileLocation}/${config.activeTunnelsFileName}`);
    const readFileAsync = promisify(fs.readFile);
    const tunnels = await readFileAsync(`${config.activeTunnelsFileLocation}/${config.activeTunnelsFileName}`, { encoding: 'utf8' });
    logger.debug('Active tunnels:', tunnels);
    return parseData(tunnels) || [];
  } catch (error) {
    logger.err('Failed to get active tunnels', error);
    return [];
  }
};

const heartbeat = (tunnel, interval) => {
  logger.log(`Starting heartbeat at ${interval}`);
  schedule.scheduleJob(interval, async () => {
    try {
      logger.log('Get active tunnels');
      const activeTunnels = await getActiveTunnels();

      const { tunnelId } = tunnel.connection;

      logger.log(`There are ${activeTunnels.length} active tunnels`);
      const foundTunnel = activeTunnels.find(activeTunnel => activeTunnel === tunnelId);

      if (!foundTunnel) {
        logger.log(`The tunnel ${tunnelId} is not active on Sauce Labs.  Reset the tunnel`);

        // if there is an exitCode, that means the process has already
        // been terminated and the sauce connect tunnel is closed
        if (tunnel.connection.exitCode || tunnel.connection.exitCode === 0) {
          logger.log('The tunnel has already been closed.  Exit process.');
          process.exit(1);
        } else {
          await tunnel.disconnect();
          logger.log('Successfully disconnected tunnel.  Exit process');
          process.exit(1);
        }
      }

      logger.log('The tunnel is still active with Sauce Labs');
    } catch (error) {
      logger.err('Failed to interval check for active tunnels', error);
      process.exit(1);
    }
  });
};

const restart = (tunnel, interval) => {
  schedule.scheduleJob(interval, async () => {
    try {
      await tunnel.disconnect();
      process.exit(1);
    } catch (error) {
      process.exit(1);
    }
  });
};

module.exports = {
  heartbeat,
  restart,
};
