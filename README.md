# ravens
ravens creates a Sauce Connect Tunnel and then manages if it is active or not.  Running ravens next to `lookout` will ensure the integrity of your Sauce Connect Tunnels.

### Evironment variables needed
    // The first 5 variables are specific to the ravens application behavior
    // The rest are specific to the Sauce Connect Connection
    
    // This is the directory to store the active-tunnels.json file
    ACTIVE_TUNNELS_FILE_LOCATION: '/usr/sauce-tunnels'
    // Where the active tunnel ids are stored
    ACTIVE_TUNNELS_FILE_NAME: 'active-tunnels.json',
    // When should the tunnel check if it's still active from a source file
    HEART_BEAT_INTERVAL: '*/30 * * * * *',
    // Logging level
    LOG_LEVEL: 'trace',
    // When should the tunnel should restart itself
    RESTART_INTERVAL: '30 11 * * *',

    // Comma-separated list of regular expressions. Requests with URLs matching one // of these will get dropped instantly and will not go through the tunnel. 
    FAST_FAIL_REG_EXPS: 'example.com',
    // How often the monitor should check the active-tunnels.json file
    // Don't remove identified tunnels with the same name, or any other default 
    // tunnels if this is a default tunnel. Jobs will be distributed between these // tunnels, enabling load balancing and high availability
    NO_REMOVE_COLLIDING_TUNNELS: true,
    // Comma-separated list of domains. Requests including hosts that matches one // of these domains will not be SSL re-encrypted.
    NO_SSL_BUMP_DOMAINS: '*.wal-mart.com',
    // Api key for Sauce Labs
    SAUCE_LABS_API_KEY: 'some-guid',
    // Username for Sauce Labs
    SAUCE_LABS_USER_NAME: 'username',
    // Allows sub-accounts of the tunnel owner to use the tunnel
    SHARED_TUNNEL: true,
    // Identity the tunnel for concurrent tunnels (optional)
    TUNNEL_IDENTIFIER: 'ravens-tunnel-id',
    // Log output from the `sc` process to stdout?
    VERBOSE: false,
    // retry to establish a tunnel multiple times. (optional)
    CONNECT_RETRIES: 2,
    // time to wait between connection retries in ms. (optional)
    CONNECT_RETRY_TIMEOUT: 1500,
    // File id to append to process id
    READY_FILE_ID: app.name,
    // Port that Sauce Connect is going to connect with
    PORT: app.port,

## Licenses

All code not otherwise specified is Copyright Wal-Mart Stores, Inc.
Released under the [MIT](./LICENSE) License.
