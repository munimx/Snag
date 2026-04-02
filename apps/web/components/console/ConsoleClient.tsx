'use client';

import type { CapturedRequest } from '@snag/shared/types';
import type { ServerMessage } from '@snag/shared/ws-messages';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  IconAlertTriangle,
  IconArrowsDiff,
  IconHistory,
  IconRefresh,
  IconTimeline,
  IconWaveSine,
} from '@tabler/icons-react';

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
  className: string;
} {
  if (state === 'connected') {
    return { label: 'Live', className: 'ws-connected' };
  }
  if (state === 'connecting' || state === 'reconnecting') {
    return { label: 'Connecting', className: 'ws-connecting' };
  }
  return { label: 'Disconnected', className: 'ws-disconnected' };
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
  const stats = useMemo(() => {
    const errored = requests.filter((request) => (request.status ?? 0) >= 400).length;
    const replayable = requests.filter((request) => request.bodyType !== null || request.body).length;
    const avgLatencySource = requests.filter((request) => request.latencyMs !== null);
    const avgLatency =
      avgLatencySource.length === 0
        ? null
        : Math.round(
            avgLatencySource.reduce((total, request) => total + (request.latencyMs ?? 0), 0) / avgLatencySource.length,
          );
    return { errored, replayable, avgLatency };
  }, [requests]);

  return (
    <main className="flex min-h-[calc(100vh-5rem)] flex-col gap-4">
      {/* Header card */}
      <header className="glass rounded-xl border border-outline-variant/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Token badge */}
          <div className="inline-flex items-center gap-3 rounded-lg border border-outline-variant/20 bg-surface-low/50 px-4 py-2.5">
            <IconTimeline size={16} className="text-primary" />
            <span className="font-label text-[11px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              Endpoint
            </span>
            <code className="rounded-md bg-surface-lowest/80 px-2.5 py-1 font-mono text-sm text-primary">
              {token}
            </code>
          </div>
          
          {/* WebSocket status */}
          <div className={`inline-flex items-center gap-2.5 rounded-lg px-4 py-2.5 ${socketStatus.className}`}>
            <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden />
            <span className="font-label text-xs font-medium uppercase tracking-extra-wide">
              {socketStatus.label}
            </span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              Captured
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {filteredCount}
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              Errors
            </p>
            <p className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${stats.errored > 0 ? 'text-destructive' : 'text-foreground'}`}>
              {stats.errored}
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              Avg latency
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {stats.avgLatency === null ? '—' : `${stats.avgLatency}ms`}
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              Replayable
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {stats.replayable}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-low/30 p-3">
          <select
            value={methodFilter}
            onChange={(event) => {
              setMethodFilter(event.target.value);
            }}
            className="h-9 rounded-lg border border-outline-variant/20 bg-surface-high/50 px-3 font-label text-xs uppercase tracking-wide text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Filter by method"
          >
            {METHOD_OPTIONS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
          <Input
            placeholder="Search path or body..."
            value={searchFilter}
            onChange={(event) => {
              setSearchFilter(event.target.value);
            }}
            className="h-9 w-full min-w-[200px] max-w-sm"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadRequests();
            }}
          >
            <IconRefresh size={14} />
            Refresh
          </Button>
          <Badge variant="secondary" className="ml-auto font-mono text-[11px]">
            {filteredCount} requests
          </Badge>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/history/${token}`}>
              <IconHistory size={14} />
              History
            </Link>
          </Button>
        </div>
      </header>

      {/* Error banner */}
      {error ? (
        <div className="inline-flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <IconAlertTriangle size={16} />
          {error}
        </div>
      ) : null}

      {/* Main content split */}
      <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Request list panel */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-high/30">
          {!user && !isHistoryBannerDismissed ? (
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant/20 bg-accent/8 px-4 py-2.5 text-sm">
              <p className="text-muted-foreground">
                Showing last 24h.{' '}
                <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
                  Log in
                </Link>{' '}
                for 30-day history.
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsHistoryBannerDismissed(true);
                }}
                aria-label="Dismiss"
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

        {/* Detail panel */}
        <div className="min-h-0 space-y-4 overflow-y-auto">
          <RequestDetail request={selectedRequest} />
          {compareId ? (
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 font-label text-xs font-medium uppercase tracking-extra-wide text-muted-foreground">
                <IconArrowsDiff size={14} />
                Compare mode
              </p>
              <JsonDiffViewer leftRequest={selectedRequest} rightRequest={compareRequest} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-outline-variant/25 bg-surface-low/30 px-4 py-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <IconWaveSine size={14} className="text-primary/60" />
                Click <span className="font-medium text-foreground">Compare</span> on a request to open JSON diff mode.
              </span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
