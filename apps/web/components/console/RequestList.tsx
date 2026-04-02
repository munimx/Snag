import type { CapturedRequest } from '@snag/shared/types';
import type React from 'react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface RequestListProps {
  requests: CapturedRequest[];
  selectedId: string | null;
  compareId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
}

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

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }
  const minutes = Math.round(diffSeconds / 60);
  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, 'minute');
  }
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, 'hour');
  }
  const days = Math.round(hours / 24);
  return rtf.format(days, 'day');
}

export function RequestList({
  requests,
  selectedId,
  compareId,
  isLoading,
  onSelect,
  onCompare,
}: RequestListProps): React.JSX.Element {
  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading requests…</div>;
  }

  if (requests.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No requests yet. Send a webhook to your endpoint.</div>;
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {requests.map((request) => {
        const isSelected = request.id === selectedId;
        const isComparing = compareId === request.id;
        return (
          <div key={request.id} className="border-b border-border p-2">
            <button
              onClick={() => {
                onSelect(request.id);
              }}
              className={`w-full rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isSelected
                  ? 'border-primary/50 bg-primary/10'
                  : 'border-transparent bg-background hover:border-border hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Badge className={getMethodBadgeClass(request.method)}>{request.method}</Badge>
                <span className="truncate text-sm font-medium">{request.path}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge className={getStatusBadgeClass(request.status)}>{request.status ?? '—'}</Badge>
                <span>{formatRelativeTime(request.receivedAt)}</span>
              </div>
            </button>
            <div className="mt-2">
              <Button
                onClick={() => {
                  onCompare(request.id);
                }}
                variant={isComparing ? 'secondary' : 'outline'}
                size="sm"
              >
                {isComparing ? 'Comparing' : 'Compare'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
