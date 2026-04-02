'use client';

import type { Delivery, ForwardRule } from '@snag/shared/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { listDeliveries, listRules } from '../../lib/api';
import { DeliveryLog } from './DeliveryLog';
import { RuleCreateForm } from './RuleCreateForm';
import { RuleList } from './RuleList';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface RulesClientProps {
  token: string;
}

export function RulesClient({ token }: RulesClientProps): React.JSX.Element {
  const [rules, setRules] = useState<ForwardRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isLoadingRules, setIsLoadingRules] = useState<boolean>(false);
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRules = useCallback(async (): Promise<void> => {
    setIsLoadingRules(true);
    setError(null);
    try {
      const response = await listRules(token);
      setRules(response);
      setSelectedRuleId((current) => current ?? response[0]?.id ?? null);
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load rules');
    } finally {
      setIsLoadingRules(false);
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

    setIsLoadingDeliveries(true);
    setError(null);
    void listDeliveries(selectedRuleId, 20)
      .then((response) => {
        setDeliveries(response.data);
      })
      .catch((caughtError: unknown) => {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to load deliveries');
      })
      .finally(() => {
        setIsLoadingDeliveries(false);
      });
  }, [selectedRuleId]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground md:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Forwarding Rules</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Token</span>
              <Badge variant="outline" className="font-mono">
                {token}
              </Badge>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href={`/console/${token}`}>← Back to console</Link>
          </Button>
        </header>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Create Rule</h2>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen((current) => !current);
              }}
            >
              {isCreateOpen ? 'Hide Form' : '+ New Rule'}
            </Button>
          </div>
          {isCreateOpen ? (
            <RuleCreateForm
              token={token}
              onCreated={() => {
                void refreshRules();
              }}
              onCancel={() => {
                setIsCreateOpen(false);
              }}
            />
          ) : null}
        </section>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Rules</h2>
              {isLoadingRules ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
            </div>
            <RuleList
              rules={rules}
              selectedRuleId={selectedRuleId}
              onSelectRule={(id) => {
                setSelectedRuleId(id);
              }}
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Delivery Log</h2>
              {isLoadingDeliveries ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
            </div>
            <DeliveryLog deliveries={deliveries} />
          </div>
        </section>
      </div>
    </main>
  );
}
