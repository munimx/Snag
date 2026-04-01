'use client';

import type { ClientMessage, ServerMessage } from '@snag/shared/ws-messages';
import { useEffect, useRef, useState } from 'react';

import { webConfig } from '../lib/config';

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 10_000;

interface UseEndpointSocketOptions {
  token: string;
  onMessage: (message: ServerMessage) => void;
}

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed';

export function useEndpointSocket({ token, onMessage }: UseEndpointSocketOptions): { state: ConnectionState } {
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const stoppedRef = useRef<boolean>(false);
  const [state, setState] = useState<ConnectionState>('idle');

  useEffect(() => {
    stoppedRef.current = false;

    const connect = (): void => {
      setState((prev) => (prev === 'idle' ? 'connecting' : 'reconnecting'));
      const ws = new WebSocket(webConfig.wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        setState('connected');
        const registerMessage: ClientMessage = {
          type: 'register',
          token,
          clientType: 'browser',
        };
        ws.send(JSON.stringify(registerMessage));
      };

      ws.onmessage = (event: MessageEvent<string>) => {
        try {
          const parsed = JSON.parse(event.data) as ServerMessage;
          onMessage(parsed);
        } catch {
          // ignore malformed payloads
        }
      };

      ws.onclose = () => {
        if (stoppedRef.current) {
          setState('closed');
          return;
        }

        reconnectAttemptsRef.current += 1;
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttemptsRef.current, RECONNECT_MAX_MS);
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      stoppedRef.current = true;
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [onMessage, token]);

  return { state };
}
