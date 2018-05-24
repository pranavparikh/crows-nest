const logger = require('testarmada-logger');

const retrieval = require('./active-tunnels-retrieval');
const shutdown = require('../shutdown');

logger.prefix = 'monitor';


const heartBeatInterval = async tunnel => {
  try {
    logger.log('Get active tunnels');
    const activeTunnels = await retrieval.getActiveTunnels();

    const { tunnelId } = tunnel.connection;

    logger.log(`There are ${activeTunnels.length} active tunnels`);
    const foundTunnel = activeTunnels.find(activeTunnel => activeTunnel === tunnelId);

    if (!foundTunnel) {
      logger.log(`The tunnel ${tunnelId} is not active on Sauce Labs.  Reset the tunnel`);

      // If there is an exitCode, that means the process has already
      // been terminated and the sauce connect tunnel is closed.  This should
      // only hapen in odd, edge, cases because we are attaching to the `.end`
      // event on the sauce connect object.  That should fire when the tunnel
      // is closed from either Sauce Labs or the running crows-nest process.
      // This is mostly a 'safety net'.
      if (tunnel.connection.exitCode || tunnel.connection.exitCode === 0) {
        logger.log('The tunnel has already been closed.  Exit process.');
        shutdown(process);
      } else {
        await tunnel.disconnect();
        logger.log('Successfully disconnected tunnel.  Exit process');
        shutdown(process);
      }
    }

    logger.log('The tunnel is still active with Sauce Labs');
  } catch (error) {
    logger.err('Failed to interval check for active tunnels', error);
    shutdown(process);
  }
};

const restartInterval = async tunnel => {
  try {
    logger.log('Restarting tunnel because of daily restart');
    await tunnel.disconnect();
    logger.log('Successfully disconnected tunnel. Shut down process');
    shutdown(process);
  } catch (error) {
    logger.err('Failed to disconnect tunnel.  Shut down process', error);
    shutdown(process);
  }
};

module.exports = {
  heartBeatInterval,
  restartInterval,
};
