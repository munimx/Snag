const DEFAULT_SERVER_URL = 'http://localhost:8080';
const DEFAULT_WS_URL = 'ws://localhost:8080/ws';
const DEFAULT_APP_URL = 'http://localhost:3000';

export const webConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL,
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? DEFAULT_SERVER_URL,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? DEFAULT_WS_URL,
};
