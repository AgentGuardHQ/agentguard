// Shared WebSocket sync protocol constants
// Used by both core/cli/sync-server.js (Node.js) and game/sync/client.js (browser)

/** Default sync server port. */
export const SYNC_PORT = 9876;

/** WebSocket message types — browser to server. */
export const MSG_PULL_CLI_STATE = 'pull_cli_state';
export const MSG_BROWSER_STATE = 'browser_state';
export const MSG_PONG = 'pong';

/** WebSocket message types — server to browser. */
export const MSG_CLI_STATE = 'cli_state';
export const MSG_CLI_EVENT = 'cli_event';
export const MSG_PING = 'ping';

/** Keepalive interval in milliseconds. */
export const PING_INTERVAL = 15000;

/** Reconnect interval in milliseconds (client-side). */
export const RECONNECT_INTERVAL = 5000;

/** Maximum reconnect attempts before giving up. */
export const MAX_RECONNECT_ATTEMPTS = 12;
