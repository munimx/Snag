import type { ClientType, ServerMessage } from '@snag/shared/ws-messages';
import { describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';

import { WsHub } from './hub.js';

type TunnelForwardMessage = Extract<ServerMessage, { type: 'tunnel_forward' }>;

type ClientAwareHub = WsHub & {
  join(token: string, socket: WebSocket, clientType: ClientType): void;
  forwardToCli(token: string, message: TunnelForwardMessage): void;
};

function createHub(): ClientAwareHub {
  return new WsHub() as ClientAwareHub;
}

function createSocket(): { socket: WebSocket; send: ReturnType<typeof vi.fn> } {
  const send = vi.fn();
  const socket = {
    OPEN: 1,
    readyState: 1,
    send,
  } as unknown as WebSocket;

  return { socket, send };
}

describe('WsHub', () => {
  it('broadcasts messages to every registered client type in the token room', () => {
    const hub = createHub();
    const browser = createSocket();
    const cli = createSocket();
    const sdk = createSocket();
    const otherTokenCli = createSocket();
    const message = { type: 'pong' } satisfies ServerMessage;

    hub.join('token-1', browser.socket, 'browser');
    hub.join('token-1', cli.socket, 'cli');
    hub.join('token-1', sdk.socket, 'sdk');
    hub.join('token-2', otherTokenCli.socket, 'cli');

    hub.broadcast('token-1', message);

    expect(browser.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(cli.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(sdk.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(otherTokenCli.send).not.toHaveBeenCalled();
  });

  it('forwards tunnel requests only to CLI clients registered for the token', () => {
    const hub = createHub();
    const browser = createSocket();
    const cli = createSocket();
    const sdk = createSocket();
    const otherTokenCli = createSocket();
    const message = {
      type: 'tunnel_forward',
      requestId: 'req_123',
      method: 'POST',
      path: '/h/token-1',
      headers: { 'content-type': 'application/json' },
      body: '{"ok":true}',
    } satisfies TunnelForwardMessage;

    hub.join('token-1', browser.socket, 'browser');
    hub.join('token-1', cli.socket, 'cli');
    hub.join('token-1', sdk.socket, 'sdk');
    hub.join('token-2', otherTokenCli.socket, 'cli');

    hub.forwardToCli('token-1', message);

    expect(browser.send).not.toHaveBeenCalled();
    expect(cli.send).toHaveBeenCalledTimes(1);
    expect(cli.send).toHaveBeenCalledWith(JSON.stringify(message));
    expect(sdk.send).not.toHaveBeenCalled();
    expect(otherTokenCli.send).not.toHaveBeenCalled();
  });

  it('removes sockets cleanly from rooms and client-type targeting on leave', () => {
    const hub = createHub();
    const rejoinedBrowser = createSocket();
    const activeCli = createSocket();
    const tunnelMessage = {
      type: 'tunnel_forward',
      requestId: 'req_456',
      method: 'GET',
      path: '/h/token-1',
      headers: {},
      body: '',
    } satisfies TunnelForwardMessage;
    const broadcastMessage = { type: 'pong' } satisfies ServerMessage;

    hub.join('token-1', rejoinedBrowser.socket, 'cli');
    hub.leave(rejoinedBrowser.socket);
    hub.join('token-1', rejoinedBrowser.socket, 'browser');
    hub.join('token-1', activeCli.socket, 'cli');

    hub.forwardToCli('token-1', tunnelMessage);
    hub.leave(activeCli.socket);
    hub.broadcast('token-1', broadcastMessage);

    expect(rejoinedBrowser.send).toHaveBeenCalledTimes(1);
    expect(rejoinedBrowser.send).toHaveBeenCalledWith(JSON.stringify(broadcastMessage));
    expect(activeCli.send).toHaveBeenCalledTimes(1);
    expect(activeCli.send).toHaveBeenCalledWith(JSON.stringify(tunnelMessage));
  });
});
