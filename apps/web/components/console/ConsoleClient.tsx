'use client';

import type { CapturedRequest } from '@snag/shared/types';
import type { ServerMessage } from '@snag/shared/ws-messages';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useEndpointSocket } from '../../hooks/useEndpointSocket';
import { getRequestDetail, listRequests } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { JsonDiffViewer } from './JsonDiffViewer';
import { RequestDetail } from './RequestDetail';
import { RequestList } from './RequestList';

interface ConsoleClientProps {
  token: string;
}

const METHOD_OPTIONS = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export function ConsoleClient({ token }: ConsoleClientProps): React.JSX.Element {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null);
  const [compareRequest, setCompareRequest] = useState<CapturedRequest | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await listRequests(token, {
        method: methodFilter === 'ALL' ? undefined : methodFilter,
        search: searchFilter.trim() === '' ? undefined : searchFilter.trim(),
        limit: 100,
      });
      setRequests(response.data);
      if (!selectedId && response.data[0]) {
        setSelectedId(response.data[0].id);
      }
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Failed to load requests';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [methodFilter, searchFilter, selectedId, token]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRequest(null);
      return;
    }
    void getRequestDetail(selectedId)
      .then((request) => {
        setSelectedRequest(request);
      })
      .catch(() => {
        setSelectedRequest(null);
      });
  }, [selectedId]);

  useEffect(() => {
    if (!compareId) {
      setCompareRequest(null);
      return;
    }
    void getRequestDetail(compareId)
      .then((request) => {
        setCompareRequest(request);
      })
      .catch(() => {
        setCompareRequest(null);
      });
  }, [compareId]);

  const onSocketMessage = useCallback((message: ServerMessage): void => {
    if (message.type !== 'request_captured') {
      return;
    }

    setRequests((current) => {
      const next = [message.request, ...current.filter((entry) => entry.id !== message.request.id)];
      return next;
    });

    setSelectedId((current) => current ?? message.request.id);
  }, []);

  const { state: socketState } = useEndpointSocket({ token, onMessage: onSocketMessage });

  const filteredCount = useMemo(() => requests.length, [requests.length]);

  return (
    <main style={{ padding: 16, height: '100vh' }}>
      <header style={{ marginBottom: 12 }}>
        <h1 style={{ marginBottom: 8 }}>Console · {token}</h1>
        <div style={{ color: '#9fb0d1' }}>Socket: {socketState}</div>
        <div style={{ color: '#9fb0d1', marginTop: 4 }}>
          History: {user ? 'Full history (authenticated)' : 'Last 24h only (login for 30-day history)'}
        </div>
      </header>

      <section
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 12,
          alignItems: 'center',
        }}
      >
        <label>
          Method:{' '}
          <select
            value={methodFilter}
            onChange={(event) => {
              setMethodFilter(event.target.value);
            }}
            style={{
              background: '#0f1730',
              color: '#e6edf3',
              border: '1px solid #2e3a5e',
              borderRadius: 6,
              padding: 6,
            }}
          >
            {METHOD_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </label>
        <input
          placeholder="Search path/body..."
          value={searchFilter}
          onChange={(event) => {
            setSearchFilter(event.target.value);
          }}
          style={{
            background: '#0f1730',
            color: '#e6edf3',
            border: '1px solid #2e3a5e',
            borderRadius: 6,
            padding: 6,
            minWidth: 280,
          }}
        />
        <button
          onClick={() => {
            void loadRequests();
          }}
          style={{
            border: '1px solid #2e3a5e',
            borderRadius: 6,
            padding: '6px 12px',
            background: '#111a33',
            color: '#d7e5ff',
          }}
        >
          Refresh
        </button>
        <span style={{ color: '#9fb0d1' }}>{filteredCount} request(s)</span>
      </section>

      {error ? <p style={{ color: '#ff8a8a' }}>{error}</p> : null}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          border: '1px solid #2e3a5e',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#111a33',
        }}
      >
        <RequestList
          requests={requests}
          selectedId={selectedId}
          compareId={compareId}
          isLoading={isLoading}
          onSelect={(id) => {
            setSelectedId(id);
          }}
          onCompare={(id) => {
            setCompareId((current) => (current === id ? null : id));
          }}
        />
        <div>
          <RequestDetail request={selectedRequest} />
          <JsonDiffViewer leftRequest={selectedRequest} rightRequest={compareRequest} />
        </div>
      </section>
    </main>
  );
}
