import type { FastifyPluginAsync } from 'fastify';
import type { ClientMessage, ServerMessage } from '@snag/shared/ws-messages';
import type { RawData } from 'ws';

import { db } from '../lib/db.js';
import { clientWsMessageSchema } from '../lib/schemas.js';
import { wsHub } from '../ws/hub.js';

const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_MISSED_PONGS = 2;

function sendMessage(send: (payload: string) => void, message: ServerMessage): void {
  send(JSON.stringify(message));
}

const wsRoute: FastifyPluginAsync = async (fastify) => {
  fastify.get('/ws', { websocket: true }, (socket, request) => {
    let registeredToken: string | null = null;
    let missedPongs = 0;

    const heartbeat = setInterval(() => {
      if (missedPongs >= MAX_MISSED_PONGS) {
        socket.terminate();
        return;
      }

      missedPongs += 1;
      socket.ping();
    }, HEARTBEAT_INTERVAL_MS);

    socket.on('pong', () => {
      missedPongs = 0;
    });

    socket.on('message', async (rawMessage: RawData) => {
      try {
        const payload = JSON.parse(rawMessage.toString()) as unknown;
        const parsed = clientWsMessageSchema.safeParse(payload);

        if (!parsed.success) {
          sendMessage(socket.send.bind(socket), { type: 'error', message: 'Invalid message format' });
          return;
        }

        const message: ClientMessage = parsed.data;
        if (message.type === 'ping') {
          sendMessage(socket.send.bind(socket), { type: 'pong' });
          return;
        }

        if (message.type === 'register') {
          const endpoint = await db.endpoint.upsert({
            where: { token: message.token },
            update: {},
            create: { token: message.token },
            select: { id: true, token: true },
          });

          registeredToken = endpoint.token;
          wsHub.join(endpoint.token, socket);

          request.log.info({ endpointId: endpoint.id, token: endpoint.token }, 'ws client registered');
          sendMessage(socket.send.bind(socket), { type: 'registered', endpointId: endpoint.id });
          return;
        }

        const updated = await db.capturedRequest.updateMany({
          where: { id: message.requestId },
          data: { status: message.status },
        });

        if (updated.count === 0) {
          sendMessage(socket.send.bind(socket), { type: 'error', message: 'Request not found for tunnel response' });
        }
      } catch (error: unknown) {
        request.log.error({ err: error }, 'ws message handling failed');
        sendMessage(socket.send.bind(socket), { type: 'error', message: 'Failed to process message' });
      }
    });

    const cleanup = (): void => {
      clearInterval(heartbeat);
      wsHub.leave(socket);
      if (registeredToken) {
        request.log.info({ token: registeredToken }, 'ws client disconnected');
      }
    };

    socket.on('close', cleanup);
    socket.on('error', (error: Error) => {
      request.log.error({ err: error }, 'ws connection error');
      cleanup();
    });
  });
};

export default wsRoute;
