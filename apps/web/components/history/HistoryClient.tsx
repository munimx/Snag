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

function getMethodBadgeClass(method: string): string {
  if (method === 'GET') {
    return 'border-blue-500/40 bg-blue-500/15 text-blue-300';
  }
  if (method === 'POST') {
    return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
  }
  if (method === 'PUT') {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
  }
  if (method === 'PATCH') {
    return 'border-orange-500/40 bg-orange-500/15 text-orange-300';
  }
  if (method === 'DELETE') {
    return 'border-red-500/40 bg-red-500/15 text-red-300';
  }
  return 'border-border bg-muted text-muted-foreground';
}

function getStatusBadgeClass(status: number | null): string {
  if (status === null) {
    return 'border-border bg-muted text-muted-foreground';
  }
  if (status >= 500) {
    return 'border-red-500/40 bg-red-500/15 text-red-300';
  }
  if (status >= 400) {
    return 'border-orange-500/40 bg-orange-500/15 text-orange-300';
  }
  if (status >= 300) {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
  }
  return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
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
      <header className="space-y-3 rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="inline-flex items-center gap-2 text-xl font-semibold sm:text-2xl">
            <IconHistory size={20} className="text-primary" />
            Request History
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="font-mono text-xs">
              {token}
            </Badge>
            <Button asChild size="sm" variant="outline" className="h-8 border-border/70 bg-background/70">
              <Link href={`/console/${token}`}>Back to console</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <IconDatabase size={12} />
              Requests
            </p>
            <p className="mt-1 font-mono text-lg font-semibold">{filteredRequests.length}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">Successful</p>
            <p className="mt-1 font-mono text-lg font-semibold">{stats.successful}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <IconAlertTriangle size={12} />
              Errors
            </p>
            <p className="mt-1 font-mono text-lg font-semibold">{stats.errored}</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background/55 px-3 py-2">
            <p className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
              <IconGauge size={12} />
              Avg latency
            </p>
            <p className="mt-1 font-mono text-lg font-semibold">{stats.avgLatency === null ? '—' : `${stats.avgLatency}ms`}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={methodFilter}
            onChange={(event) => {
              setMethodFilter(event.target.value);
            }}
            className="h-9 rounded-md border border-input bg-background/70 px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            className="h-9 min-w-[220px] flex-1 bg-background/70"
          />
          <div className="inline-flex items-center rounded-md border border-border/70 bg-secondary/35 p-1">
            {RANGE_OPTIONS.map((range) => (
              <Button
                key={range.key}
                variant={rangeFilter === range.key ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => {
                  setRangeFilter(range.key);
                }}
                className="h-7 rounded-sm px-2 text-[11px] font-mono"
              >
                {range.label}
              </Button>
            ))}
          </div>
          <Badge variant="outline" className="border-border/80 bg-background/60 text-[11px]">
            {filteredRequests.length} requests
          </Badge>
        </div>
      </header>

      {!user && !isHistoryBannerDismissed ? (
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/45 px-3 py-2 text-sm">
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

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/20 hover:bg-secondary/20">
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
                  <span className="rounded-md border border-border/60 bg-secondary/25 px-2 py-1">Loading requests…</span>
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-red-400">
                  <span className="inline-flex items-center gap-2 rounded-md border border-red-500/35 bg-red-500/10 px-2 py-1 text-red-300">
                    <IconAlertTriangle size={14} />
                    {error}
                  </span>
                </TableCell>
              </TableRow>
            ) : null}
            {!isLoading && !error && filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  <span className="rounded-md border border-dashed border-border/65 bg-secondary/20 px-2 py-1">
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
                     className="cursor-pointer transition-colors hover:bg-secondary/20"
                  >
                    <TableCell>
                      <Badge className={getMethodBadgeClass(request.method)}>{request.method}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{request.path}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeClass(request.status)}>{request.status ?? '—'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{getBodyTypeLabel(request.bodyType)}</TableCell>
                    <TableCell>{formatReceivedAt(request.receivedAt)}</TableCell>
                    <TableCell>{formatLatency(request.latencyMs)}</TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </section>
    </main>
  );
}
