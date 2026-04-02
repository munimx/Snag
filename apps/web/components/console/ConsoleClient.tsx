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
  glowClassName: string;
  dotClassName: string;
} {
  if (state === 'connected') {
    return { label: 'Connected', glowClassName: 'shadow-emerald-500/30', dotClassName: 'bg-emerald-500' };
  }
  if (state === 'connecting' || state === 'reconnecting') {
    return { label: 'Reconnecting', glowClassName: 'shadow-amber-400/30', dotClassName: 'bg-amber-400' };
  }
  return { label: 'Disconnected', glowClassName: 'shadow-red-500/30', dotClassName: 'bg-red-500' };
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
    <main className="flex min-h-[calc(100vh-5rem)] flex-col gap-3">
      <header className="rounded-xl border border-border/70 bg-card/65 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-secondary/30 px-3 py-2">
            <IconTimeline size={14} className="text-primary/90" />
            <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">Token</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {token}
            </Badge>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
            <span
              className={`size-2 rounded-full ${socketStatus.dotClassName} ${socketStatus.glowClassName} shadow-[0_0_12px_currentColor]`}
              aria-hidden
            />
            <span className="text-xs font-medium uppercase tracking-wide">{socketStatus.label}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Captured</p>
            <p className="mt-1 font-mono text-lg font-semibold">{filteredCount}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Errors (4xx/5xx)</p>
            <p className="mt-1 font-mono text-lg font-semibold">{stats.errored}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Avg latency</p>
            <p className="mt-1 font-mono text-lg font-semibold">{stats.avgLatency === null ? '—' : `${stats.avgLatency}ms`}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Replay-ready</p>
            <p className="mt-1 font-mono text-lg font-semibold">{stats.replayable}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-secondary/20 p-2">
          <select
            value={methodFilter}
            onChange={(event) => {
              setMethodFilter(event.target.value);
            }}
            className="h-9 rounded-md border border-input bg-background/85 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="h-9 w-full min-w-[240px] max-w-sm bg-background/85"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-9 border-border/80 bg-background/80"
            onClick={() => {
              void loadRequests();
            }}
          >
            <IconRefresh size={14} />
            Refresh
          </Button>
          <Badge variant="outline" className="border-border/80 bg-background/70 font-mono text-[11px]">
            {filteredCount} requests
          </Badge>
          <Button asChild variant="ghost" size="sm" className="h-9">
            <Link href={`/history/${token}`}>
              <IconHistory size={14} />
              History
            </Link>
          </Button>
        </div>
      </header>

      {error ? (
        <p className="inline-flex items-center gap-2 rounded-lg border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          <IconAlertTriangle size={14} />
          {error}
        </p>
      ) : null}

      <section className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/55">
          {!user && !isHistoryBannerDismissed ? (
            <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-muted/45 px-3 py-2 text-sm">
              <p className="text-muted-foreground">
                Showing last 24h only.{' '}
                <Link href="/login" className="font-medium text-primary underline underline-offset-4">
                  Log in
                </Link>{' '}
                for 30-day history.
              </p>
              <Button
                size="xs"
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
         <div className="min-h-0 space-y-3 overflow-y-auto">
          <RequestDetail request={selectedRequest} />
          {compareId ? (
            <div className="space-y-2">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <IconArrowsDiff size={13} />
                Compare mode
              </p>
              <JsonDiffViewer leftRequest={selectedRequest} rightRequest={compareRequest} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/70 bg-card/40 px-4 py-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <IconWaveSine size={14} />
                Select <span className="font-medium text-foreground">Compare</span> on a request to open JSON diff mode.
              </span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
