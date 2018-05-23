/**
 * TODO: extend this file to get active tunnels from other sources
 *       such as a message or db.  Use the configuration to drive
 *       where the data gets pulled from.
 */

const fs = require('fs');
const logger = require('testarmada-logger');
const { promisify } = require('util');

const config = require('../../config');

logger.prefix = 'monitor';

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

module.exports = {
  getActiveTunnels,
};
