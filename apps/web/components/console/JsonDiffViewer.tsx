'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useMemo } from 'react';
import type React from 'react';
import { IconArrowsDiff } from '@tabler/icons-react';

import { diffJson, parseJsonBody } from '../../lib/json-diff';
import { Badge } from '../ui/badge';

interface JsonDiffViewerProps {
  leftRequest: CapturedRequest | null;
  rightRequest: CapturedRequest | null;
}

function badgeColor(status: 'added' | 'removed' | 'changed'): string {
  if (status === 'added') {
    return 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';
  }
  if (status === 'removed') {
    return 'border-red-500/40 bg-red-500/15 text-red-300';
  }
  return 'border-blue-500/40 bg-blue-500/15 text-blue-300';
}

export function JsonDiffViewer({ leftRequest, rightRequest }: JsonDiffViewerProps): React.JSX.Element {
  const diffEntries = useMemo(() => {
    if (!leftRequest || !rightRequest) {
      return [];
    }

    const leftJson = parseJsonBody(leftRequest.body);
    const rightJson = parseJsonBody(rightRequest.body);
    if (leftJson === null || rightJson === null) {
      return [];
    }

    return diffJson(leftJson, rightJson);
  }, [leftRequest, rightRequest]);

  if (!leftRequest || !rightRequest) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/45 px-4 py-3 text-sm text-muted-foreground">
        Choose a second request in the list to compare JSON bodies.
      </div>
    );
  }

  const leftJson = parseJsonBody(leftRequest.body);
  const rightJson = parseJsonBody(rightRequest.body);
  if (leftJson === null || rightJson === null) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/45 px-4 py-3 text-sm text-amber-300">
        JSON diff is only available when both request bodies are valid JSON.
      </div>
    );
  }

  return (
    <section className="space-y-2 rounded-lg border border-border/60 bg-card/45 p-4">
      <h3 className="inline-flex items-center gap-2 text-sm font-medium">
        <IconArrowsDiff size={14} />
        JSON Diff
      </h3>
      {diffEntries.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No differences found.</p> : null}
      {diffEntries.map((entry) => (
        <div
          key={`${entry.path}-${entry.status}`}
          className="mt-2 rounded-md border border-border/60 bg-secondary/25 p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <strong className="font-mono text-xs">{entry.path}</strong>
            <Badge className={badgeColor(entry.status)}>
              {entry.status}
            </Badge>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <div className="mb-1 text-xs text-muted-foreground">Before</div>
              <pre className="whitespace-pre-wrap break-words rounded-md bg-background/70 p-2 font-mono text-xs">
                {entry.before}
              </pre>
            </div>
            <div>
              <div className="mb-1 text-xs text-muted-foreground">After</div>
              <pre className="whitespace-pre-wrap break-words rounded-md bg-background/70 p-2 font-mono text-xs">
                {entry.after}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
