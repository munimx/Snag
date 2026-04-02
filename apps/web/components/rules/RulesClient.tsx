'use client';

import type { Delivery, ForwardRule } from '@snag/shared/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { IconChevronDown, IconChevronUp, IconRoute } from '@tabler/icons-react';

import { listDeliveries, listRules } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
    <main className="min-h-[calc(100vh-5rem)] space-y-4 text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/60 p-4">
        <div className="space-y-2">
          <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <IconRoute size={20} className="text-primary" />
            Forwarding Rules
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Token</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {token}
            </Badge>
          </div>
        </div>
        <Button asChild variant="outline" className="h-9 border-border/70 bg-background/70">
          <Link href={`/console/${token}`}>Back to console</Link>
        </Button>
      </header>

      <section className="space-y-3 rounded-xl border border-border/70 bg-card/55 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">Create Rule</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-border/75 bg-background/70"
            onClick={() => {
              setIsCreateOpen((current) => !current);
            }}
          >
            {isCreateOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            {isCreateOpen ? 'Collapse' : 'New Rule'}
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
        ) : (
          <p className="text-sm text-muted-foreground">Create a forwarding rule for destination routing and retries.</p>
        )}
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border/70 bg-card/55 p-4">
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
        <div className="space-y-3 rounded-xl border border-border/70 bg-card/55 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Delivery Log</h2>
            {isLoadingDeliveries ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
          </div>
          <DeliveryLog deliveries={deliveries} />
        </div>
      </section>
    </main>
  );
}
