const DEFAULT_APP_URL = 'https://snag-web-five.vercel.app';
const DEFAULT_SERVER_URL = 'https://snag-server.fly.dev';
const DEFAULT_WS_URL = 'wss://snag-server.fly.dev/ws';

export const webConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL,
  isDevelopment: process.env.NODE_ENV === 'development',
  serverUrl: process.env.NEXT_PUBLIC_SERVER_URL ?? DEFAULT_SERVER_URL,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL ?? DEFAULT_WS_URL,
};
