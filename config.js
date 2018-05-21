const {
  ACTIVE_TUNNELS_FILE_LOCATION,
  ACTIVE_TUNNELS_FILE_NAME,
  CONNECT_RETRIES,
  CONNECT_RETRY_TIMEOUT,
  FAST_FAIL_REG_EXPS,
  HEART_BEAT_INTERVAL,
  NO_REMOVE_COLLIDING_TUNNELS,
  NO_SSL_BUMP_DOMAINS,
  PORT,
  PROXY,
  READY_FILE_ID,
  RESTART_INTERVAL,
  SAUCE_LABS_API_KEY,
  SAUCE_LABS_USER_NAME,
  SHARED_TUNNEL,
  DELAY_START,
  TUNNEL_IDENTIFIER,
  VERBOSE,
} = process.env;

const config = {
  tunnel: {
    accessKey: SAUCE_LABS_API_KEY,
    connectRetries: CONNECT_RETRIES,
    connectRetryTimeout: CONNECT_RETRY_TIMEOUT,
    fastFailRegexps: FAST_FAIL_REG_EXPS,
    // TODO: use the app logger to format this message instead of
    //       using console.log
    logger: console.log,
    noRemoveCollidingTunnels: NO_REMOVE_COLLIDING_TUNNELS === 'true',
    noSslBumpDomains: NO_SSL_BUMP_DOMAINS,
    // If multiple tunnels are going to be connected, they have
    // to have access to different .pid files
    pidfile: `/tmp/${READY_FILE_ID}.pid`,
    // If multiple tunnels are going to be connected, they have
    // to be connected on different ports
    port: parseInt(PORT, 10),
    proxy: PROXY,
    // TODO: find out if this property is still needed
    readyFileId: READY_FILE_ID,
    sharedTunnel: SHARED_TUNNEL === 'true',
    tunnelIdentifier: TUNNEL_IDENTIFIER,
    username: SAUCE_LABS_USER_NAME,
    verbose: VERBOSE === 'true',
  },
  // If another collection of tunnels is going to use the same
  // credentials, they have to have the same ACTIVE_TUNNELS_FILE_NAME
  // or the logic in finding active tunnels is going to be broken
  // TODO: how to handle when a customer wants to use a db or message
  //       bus instead of files to check active tunnels?
  activeTunnelsFileLocation: ACTIVE_TUNNELS_FILE_LOCATION,
  activeTunnelsFileName: ACTIVE_TUNNELS_FILE_NAME,
  delayStart: DELAY_START,
  heartbeatInterval: HEART_BEAT_INTERVAL,
  restartInterval: RESTART_INTERVAL,
};

module.exports = config;
