'use client';

import type { CapturedRequest } from '@snag/shared/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconAlertTriangle, IconDatabase, IconGauge, IconHistory } from '@tabler/icons-react';

import { listRequests } from '../../lib/api';
import { useAuth } from '../auth/AuthProvider';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface HistoryClientProps {
  token: string;
}

const METHOD_OPTIONS = ['ALL', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const RANGE_OPTIONS = [
  { key: '24h', label: '24h', hours: 24 },
  { key: '7d', label: '7d', hours: 24 * 7 },
  { key: '30d', label: '30d', hours: 24 * 30 },
] as const;

type RangeKey = (typeof RANGE_OPTIONS)[number]['key'];

function getMethodVariant(method: string): 'get' | 'post' | 'put' | 'patch' | 'delete' | 'default' {
  const methodLower = method.toLowerCase();
  if (methodLower === 'get') return 'get';
  if (methodLower === 'post') return 'post';
  if (methodLower === 'put') return 'put';
  if (methodLower === 'patch') return 'patch';
  if (methodLower === 'delete') return 'delete';
  return 'default';
}

function getStatusVariant(status: number | null): 'status2xx' | 'status3xx' | 'status4xx' | 'status5xx' | 'secondary' {
  if (status === null) return 'secondary';
  if (status >= 500) return 'status5xx';
  if (status >= 400) return 'status4xx';
  if (status >= 300) return 'status3xx';
  return 'status2xx';
}

function getBodyTypeLabel(bodyType: string | null): string {
  if (!bodyType) {
    return '—';
  }
  return bodyType;
}

function formatReceivedAt(value: string): string {
  return new Date(value).toLocaleString();
}

function formatLatency(latencyMs: number | null): string {
  if (latencyMs === null) {
    return '—';
  }
  return `${latencyMs} ms`;
}

export function HistoryClient({ token }: HistoryClientProps): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const [requests, setRequests] = useState<CapturedRequest[]>([]);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [rangeFilter, setRangeFilter] = useState<RangeKey>('24h');
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
  }, [methodFilter, searchFilter, token]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    const option = RANGE_OPTIONS.find((range) => range.key === rangeFilter);
    if (!option) {
      return requests;
    }

    const cutoff = Date.now() - option.hours * 60 * 60 * 1000;
    return requests.filter((request) => new Date(request.receivedAt).getTime() >= cutoff);
  }, [rangeFilter, requests]);

  const stats = useMemo(() => {
    const errored = filteredRequests.filter((request) => (request.status ?? 0) >= 400).length;
    const successful = filteredRequests.filter((request) => {
      const status = request.status ?? 0;
      return status >= 200 && status < 400;
    }).length;
    const latencySource = filteredRequests.filter((request) => request.latencyMs !== null);
    const avgLatency =
      latencySource.length === 0
        ? null
        : Math.round(latencySource.reduce((total, request) => total + (request.latencyMs ?? 0), 0) / latencySource.length);
    return { errored, successful, avgLatency };
  }, [filteredRequests]);

  return (
    <main className="min-h-[calc(100vh-5rem)] space-y-4 text-foreground">
      {/* Header card */}
      <header className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-high/30 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="inline-flex items-center gap-3 text-xl font-semibold tracking-tight sm:text-2xl">
            <IconHistory size={22} className="text-primary" />
            Request History
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-lg border border-outline-variant/20 bg-surface-lowest/80 px-3 py-1.5 font-mono text-sm text-primary">
              {token}
            </code>
            <Button asChild size="sm" variant="outline">
              <Link href={`/console/${token}`}>Back to console</Link>
            </Button>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="inline-flex items-center gap-1.5 font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              <IconDatabase size={12} />
              Requests
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">{filteredRequests.length}</p>
          </div>
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              Successful
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-success">{stats.successful}</p>
          </div>
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="inline-flex items-center gap-1.5 font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              <IconAlertTriangle size={12} />
              Errors
            </p>
            <p className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${stats.errored > 0 ? 'text-destructive' : ''}`}>
              {stats.errored}
            </p>
          </div>
          <div className="rounded-lg border border-outline-variant/15 bg-surface-high/40 px-4 py-3 transition-colors hover:bg-surface-high/60">
            <p className="inline-flex items-center gap-1.5 font-label text-[10px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              <IconGauge size={12} />
              Avg latency
            </p>
            <p className="mt-1.5 font-mono text-2xl font-semibold tabular-nums">
              {stats.avgLatency === null ? '—' : `${stats.avgLatency}ms`}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/15 bg-surface-low/30 p-3">
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
            className="h-9 min-w-[200px] flex-1"
          />
          <div className="inline-flex items-center rounded-lg border border-outline-variant/20 bg-surface-high/30 p-1">
            {RANGE_OPTIONS.map((range) => (
              <Button
                key={range.key}
                variant={rangeFilter === range.key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setRangeFilter(range.key);
                }}
                className="h-7 rounded-md px-3 font-mono text-[11px]"
              >
                {range.label}
              </Button>
            ))}
          </div>
          <Badge variant="secondary" className="ml-auto font-mono text-[11px]">
            {filteredRequests.length} requests
          </Badge>
        </div>
      </header>

      {/* Login banner */}
      {!user && !isHistoryBannerDismissed ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/20 bg-accent/8 px-4 py-3 text-sm">
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

      {/* Table */}
      <section className="overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-high/30">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Body type</TableHead>
              <TableHead>Received at</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-surface-low/40 px-3 py-2 animate-shimmer">
                    Loading requests...
                  </span>
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && error ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <span className="inline-flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/8 px-3 py-2 text-destructive">
                    <IconAlertTriangle size={14} />
                    {error}
                  </span>
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && !error && filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  <span className="rounded-lg border border-dashed border-outline-variant/25 bg-surface-low/30 px-3 py-2">
                    No requests found for the selected filters.
                  </span>
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && !error
              ? filteredRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      router.push(`/console/${encodeURIComponent(token)}?selected=${encodeURIComponent(request.id)}`);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/console/${encodeURIComponent(token)}?selected=${encodeURIComponent(request.id)}`);
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <Badge variant={getMethodVariant(request.method)}>{request.method}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{request.path}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(request.status)}>{request.status ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{getBodyTypeLabel(request.bodyType)}</TableCell>
                    <TableCell>{formatReceivedAt(request.receivedAt)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatLatency(request.latencyMs)}</TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
