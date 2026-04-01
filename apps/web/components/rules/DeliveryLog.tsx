import type { Delivery } from '@snag/shared/types';

interface DeliveryLogProps {
  deliveries: Delivery[];
}

export function DeliveryLog({ deliveries }: DeliveryLogProps): React.JSX.Element {
  if (deliveries.length === 0) {
    return <p style={{ color: '#9fb0d1' }}>No delivery attempts yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {deliveries.map((delivery) => (
        <article
          key={delivery.id}
          style={{
            border: '1px solid #2e3a5e',
            borderRadius: 8,
            padding: 10,
            background: '#111a33',
            color: '#d7e5ff',
          }}
        >
          <div style={{ fontWeight: 600 }}>
            Attempt #{delivery.attempt} · Status {delivery.status ?? 'N/A'}
          </div>
          <div style={{ fontSize: 12, color: '#9fb0d1' }}>{delivery.targetUrl}</div>
          <div style={{ fontSize: 12, color: '#9fb0d1' }}>Latency: {delivery.latencyMs ?? 0}ms</div>
          {delivery.error ? <div style={{ color: '#ff8a8a' }}>{delivery.error}</div> : null}
        </article>
      ))}
    </div>
  );
}
