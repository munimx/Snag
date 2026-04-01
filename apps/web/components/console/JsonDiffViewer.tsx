'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useMemo } from 'react';
import type React from 'react';

import { diffJson, parseJsonBody } from '../../lib/json-diff';

interface JsonDiffViewerProps {
  leftRequest: CapturedRequest | null;
  rightRequest: CapturedRequest | null;
}

function badgeColor(status: 'added' | 'removed' | 'changed'): string {
  if (status === 'added') {
    return '#1d5331';
  }
  if (status === 'removed') {
    return '#5a2732';
  }
  return '#37456f';
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
      <div style={{ borderTop: '1px solid #2e3a5e', padding: 16, color: '#9fb0d1' }}>
        Choose a second request in the list to compare JSON bodies.
      </div>
    );
  }

  const leftJson = parseJsonBody(leftRequest.body);
  const rightJson = parseJsonBody(rightRequest.body);
  if (leftJson === null || rightJson === null) {
    return (
      <div style={{ borderTop: '1px solid #2e3a5e', padding: 16, color: '#ffb86b' }}>
        JSON diff is only available when both request bodies are valid JSON.
      </div>
    );
  }

  return (
    <section style={{ borderTop: '1px solid #2e3a5e', padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>JSON Diff</h3>
      {diffEntries.length === 0 ? <p style={{ color: '#9fb0d1' }}>No differences found.</p> : null}
      {diffEntries.map((entry) => (
        <div
          key={`${entry.path}-${entry.status}`}
          style={{
            border: '1px solid #2e3a5e',
            borderRadius: 8,
            padding: 12,
            marginBottom: 8,
            background: '#0f1730',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <strong>{entry.path}</strong>
            <span
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: 999,
                background: badgeColor(entry.status),
              }}
            >
              {entry.status}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ color: '#9fb0d1', marginBottom: 4 }}>Before</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{entry.before}</pre>
            </div>
            <div>
              <div style={{ color: '#9fb0d1', marginBottom: 4 }}>After</div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{entry.after}</pre>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
