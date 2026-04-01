'use client';

import type { Delivery, ForwardRule } from '@snag/shared/types';
import { useCallback, useEffect, useState } from 'react';

import { listDeliveries, listRules } from '../../lib/api';
import { DeliveryLog } from './DeliveryLog';
import { RuleCreateForm } from './RuleCreateForm';
import { RuleList } from './RuleList';

interface RulesClientProps {
  token: string;
}

export function RulesClient({ token }: RulesClientProps): React.JSX.Element {
  const [rules, setRules] = useState<ForwardRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshRules = useCallback(async (): Promise<void> => {
    setError(null);
    try {
      const response = await listRules(token);
      setRules(response);
      setSelectedRuleId((current) => current ?? response[0]?.id ?? null);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load rules');
    }
  }, [token]);

  useEffect(() => {
    void refreshRules();
  }, [refreshRules]);

  useEffect(() => {
    if (!selectedRuleId) {
      setDeliveries([]);
      return;
    }

    void listDeliveries(selectedRuleId, 20)
      .then((response) => {
        setDeliveries(response.data);
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load deliveries');
      });
  }, [selectedRuleId]);

  return (
    <main style={{ padding: 16 }}>
      <h1>Forwarding Rules · {token}</h1>
      <RuleCreateForm token={token} onCreated={() => void refreshRules()} />
      {error ? <p style={{ color: '#ff8a8a' }}>{error}</p> : null}

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <h2>Rules</h2>
          <RuleList
            rules={rules}
            selectedRuleId={selectedRuleId}
            onSelectRule={(id) => {
              setSelectedRuleId(id);
            }}
          />
        </div>
        <div>
          <h2>Delivery Log</h2>
          <DeliveryLog deliveries={deliveries} />
        </div>
      </section>
    </main>
  );
}
