import type { CapturedRequest } from '@snag/shared/types';
import type React from 'react';
import { IconArrowsDiff } from '@tabler/icons-react';

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
    return (
      <div className="space-y-2 p-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-20 animate-shimmer rounded-lg" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="p-4">
        <div className="rounded-lg border border-dashed border-outline-variant/25 bg-surface-low/30 px-4 py-6 text-center text-sm text-muted-foreground">
          No requests yet. Send a webhook to your endpoint to populate the feed.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
      {requests.map((request) => {
        const isSelected = request.id === selectedId;
        const isComparing = compareId === request.id;
        return (
          <div key={request.id} className="py-1">
            <button
              onClick={() => {
                onSelect(request.id);
              }}
              className={`w-full rounded-lg border px-3 py-3 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                isSelected
                  ? 'border-primary/40 bg-primary/8 shadow-glow-sm'
                  : 'border-outline-variant/15 bg-surface-high/30 hover:border-outline-variant/30 hover:bg-surface-high/60'
              }`}
            >
              <div className="flex items-center gap-2">
                <Badge variant={getMethodVariant(request.method)}>{request.method}</Badge>
                <span className="truncate font-mono text-sm text-foreground">{request.path}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={getStatusVariant(request.status)}>{request.status ?? '—'}</Badge>
                <span className="opacity-70">{formatRelativeTime(request.receivedAt)}</span>
              </div>
            </button>
            <div className="mt-1.5 px-1">
              <Button
                onClick={() => {
                  onCompare(request.id);
                }}
                variant={isComparing ? 'secondary' : 'ghost'}
                size="sm"
                className="font-label text-[10px] uppercase tracking-extra-wide"
              >
                <IconArrowsDiff size={12} />
                {isComparing ? 'Comparing' : 'Compare'}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
