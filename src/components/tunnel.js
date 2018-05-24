const logger = require('testarmada-logger');
const sauceConnectLauncher = require('sauce-connect-launcher');
const { promisify } = require('util');

logger.prefix = 'Tunnel';

function Tunnel(config) {
  this.config = config;
}

Tunnel.prototype.connect = async function connect() {
  try {
    logger.log('Connecting to sauce connect with options: ', JSON.stringify(this.config));
    const sauceConnectLauncherAsync = promisify(sauceConnectLauncher);
    this.connection = await sauceConnectLauncherAsync(this.config);

    logger.log(`Successfully connected with tunnel id: ${this.connection.tunnelId}`);

    // Attach to the close event so if the tunnel is closed for
    // any reason, it should kill the process.
    this.connection.on('close', () => {
      logger.log(`The tunnel connection with id ${this.connection.tunnelId} has closed.  Exit the process`);
      process.exit(1);
    });
  } catch (error) {
    logger.err('Failed to connect to sauce connect', error);
    throw error;
  }
};

Tunnel.prototype.disconnect = async function disconnect() {
  try {
    logger.log(`Disconnecting sauce connect tunnel ${this.connection.tunnelId}`);
    logger.log(JSON.stringify(this.connection));
    const connectionCloseAsync = promisify(this.connection.close);
    await connectionCloseAsync();
    logger.log('Successfully disconnected sauce connect tunnel');
  } catch (error) {
    logger.err('Failed to disconnect from sacue connect', error);
    throw error;
  }
};

module.exports = Tunnel;
