import type { CapturedRequest } from '@snag/shared/types';
import type React from 'react';

interface RequestListProps {
  requests: CapturedRequest[];
  selectedId: string | null;
  compareId: string | null;
  isLoading: boolean;
  onSelect: (id: string) => void;
  onCompare: (id: string) => void;
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
    return <div style={{ padding: 16, color: '#9fb0d1' }}>Loading requests…</div>;
  }

  if (requests.length === 0) {
    return <div style={{ padding: 16, color: '#9fb0d1' }}>No requests yet. Send a webhook to your endpoint.</div>;
  }

  return (
    <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 190px)' }}>
      {requests.map((request) => {
        const isSelected = request.id === selectedId;
        return (
          <div
            key={request.id}
            style={{
              borderBottom: '1px solid #243150',
              background: '#111a33',
              padding: 8,
            }}
          >
            <button
              onClick={() => {
                onSelect(request.id);
              }}
              style={{
                width: '100%',
                display: 'grid',
                gap: 4,
                textAlign: 'left',
                padding: 8,
                border: 'none',
                borderRadius: 8,
                background: isSelected ? '#1d2a4a' : '#111a33',
                color: '#e6edf3',
                cursor: 'pointer',
              }}
            >
              <div>
                <strong>{request.method}</strong> <span>{request.path}</span>
              </div>
              <small style={{ color: '#9fb0d1' }}>
                {request.status ?? '—'} · {new Date(request.receivedAt).toLocaleTimeString()}
              </small>
            </button>
            <div style={{ marginTop: 6 }}>
              <button
                onClick={() => {
                  onCompare(request.id);
                }}
                style={{
                  border: '1px solid #2e3a5e',
                  borderRadius: 999,
                  padding: '2px 8px',
                  fontSize: 12,
                  color: '#d7e5ff',
                  background: compareId === request.id ? '#37456f' : '#0f1730',
                }}
              >
                {compareId === request.id ? 'Comparing' : 'Compare'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
