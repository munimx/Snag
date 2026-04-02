'use client';

import type { CapturedRequest } from '@snag/shared/types';
import type { ServerMessage } from '@snag/shared/ws-messages';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useEndpointSocket } from '../../hooks/useEndpointSocket';
import { getRequestDetail, listRequests } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { JsonDiffViewer } from './JsonDiffViewer';
import { RequestDetail } from './RequestDetail';
import { RequestList } from './RequestList';

interface ConsoleClientProps {
  token: string;
}

const METHOD_OPTIONS = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

function getSocketStatusMeta(state: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'): {
  label: string;
  dotClassName: string;
} {
  if (state === 'connected') {
    return { label: 'Connected', dotClassName: 'bg-emerald-500' };
  }
  if (state === 'connecting' || state === 'reconnecting') {
    return { label: 'Reconnecting', dotClassName: 'bg-amber-400' };
  }
  return { label: 'Disconnected', dotClassName: 'bg-red-500' };
}

export function ConsoleClient({ token }: ConsoleClientProps): React.JSX.Element {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const selectedQueryId = searchParams.get('selected');
  const hasAppliedQuerySelectionRef = useRef<boolean>(false);
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CapturedRequest | null>(null);
  const [compareRequest, setCompareRequest] = useState<CapturedRequest | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryBannerDismissed, setIsHistoryBannerDismissed] = useState<boolean>(false);

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

  useEffect(() => {
    if (!selectedQueryId) {
      hasAppliedQuerySelectionRef.current = true;
      return;
    }
    hasAppliedQuerySelectionRef.current = false;
  }, [selectedQueryId]);

  useEffect(() => {
    if (requests.length === 0) {
      setSelectedId(null);
      return;
    }

    if (selectedQueryId && !hasAppliedQuerySelectionRef.current) {
      const matchedRequest = requests.find((request) => request.id === selectedQueryId);
      if (matchedRequest) {
        setSelectedId(matchedRequest.id);
        hasAppliedQuerySelectionRef.current = true;
        return;
      }
    }

    setSelectedId((current) => {
      if (current && requests.some((request) => request.id === current)) {
        return current;
      }
      return requests[0]?.id ?? null;
    });
  }, [requests, selectedQueryId]);

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
  const socketStatus = getSocketStatusMeta(socketState);

  return (
    <main className="flex h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Token</span>
            <Badge variant="secondary" className="font-mono">
              {token}
            </Badge>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-sm text-muted-foreground">
            <span className={`size-2 rounded-full ${socketStatus.dotClassName}`} aria-hidden />
            <span className="text-xs font-medium uppercase tracking-wide">{socketStatus.label}</span>
          </div>
          <select
            value={methodFilter}
            onChange={(event) => {
              setMethodFilter(event.target.value);
            }}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Filter requests by method"
          >
            {METHOD_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <Input
            placeholder="Search path/body..."
            value={searchFilter}
            onChange={(event) => {
              setSearchFilter(event.target.value);
            }}
            className="w-full min-w-[240px] max-w-sm"
          />
          <Button
            variant="outline"
            onClick={() => {
              void loadRequests();
            }}
          >
            Refresh
          </Button>
          <Badge variant="outline">{filteredCount} requests</Badge>
        </div>
      </header>

      {error ? <p className="px-4 py-2 text-sm text-red-400">{error}</p> : null}

      <section className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] overflow-hidden border-t border-border">
        <div className="flex min-h-0 flex-col border-r border-border">
          {!user && !isHistoryBannerDismissed ? (
            <div className="flex items-start justify-between gap-3 border-b border-border bg-muted/50 px-3 py-2 text-sm">
              <p className="text-muted-foreground">
                Showing last 24h only.{' '}
                <a href="/login" className="font-medium text-primary underline underline-offset-4">
                  Log in
                </a>{' '}
                for 30-day history.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsHistoryBannerDismissed(true);
                }}
                aria-label="Dismiss history notice"
              >
                Dismiss
              </Button>
            </div>
          ) : null}
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
        </div>
        <div className="min-h-0 overflow-y-auto">
          <RequestDetail request={selectedRequest} />
          {compareId ? <JsonDiffViewer leftRequest={selectedRequest} rightRequest={compareRequest} /> : null}
        </div>
      </section>
    </main>
  );
}
