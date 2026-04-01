import type { ServerMessage } from '@snag/shared/ws-messages';
import type { WebSocket } from 'ws';

type Waiter = (requestId: string) => void;

export class WsHub {
  private readonly rooms = new Map<string, Set<WebSocket>>();
  private readonly socketToToken = new Map<WebSocket, string>();
  private readonly waiters = new Map<string, Set<Waiter>>();

  public join(token: string, socket: WebSocket): void {
    const room = this.rooms.get(token) ?? new Set<WebSocket>();
    room.add(socket);
    this.rooms.set(token, room);
    this.socketToToken.set(socket, token);
  }

  public leave(socket: WebSocket): void {
    const token = this.socketToToken.get(socket);
    if (!token) {
      return;
    }

    const room = this.rooms.get(token);
    if (room) {
      room.delete(socket);
      if (room.size === 0) {
        this.rooms.delete(token);
      }
    }

    this.socketToToken.delete(socket);
  }

  public broadcast(token: string, message: ServerMessage): void {
    const room = this.rooms.get(token);
    if (!room || room.size === 0) {
      return;
    }

    const encoded = JSON.stringify(message);
    for (const socket of room) {
      if (socket.readyState === socket.OPEN) {
        socket.send(encoded);
      }
    }
  }

  public waitForNext(token: string, timeoutMs: number): Promise<string | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.removeWaiter(token, waiter);
        resolve(null);
      }, timeoutMs);

      const waiter: Waiter = (requestId) => {
        clearTimeout(timeout);
        this.removeWaiter(token, waiter);
        resolve(requestId);
      };

      const tokenWaiters = this.waiters.get(token) ?? new Set<Waiter>();
      tokenWaiters.add(waiter);
      this.waiters.set(token, tokenWaiters);
    });
  }

  public notifyCaptured(token: string, requestId: string): void {
    const tokenWaiters = this.waiters.get(token);
    if (!tokenWaiters || tokenWaiters.size === 0) {
      return;
    }

    for (const waiter of tokenWaiters) {
      waiter(requestId);
    }

    this.waiters.delete(token);
  }

  private removeWaiter(token: string, waiter: Waiter): void {
    const tokenWaiters = this.waiters.get(token);
    if (!tokenWaiters) {
      return;
    }

    tokenWaiters.delete(waiter);
    if (tokenWaiters.size === 0) {
      this.waiters.delete(token);
    }
  }
}

export const wsHub = new WsHub();
