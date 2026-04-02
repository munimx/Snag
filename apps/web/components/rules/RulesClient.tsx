'use client';

import type { Delivery, ForwardRule } from '@snag/shared/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { IconChevronDown, IconChevronUp, IconListCheck, IconRoute, IconTable } from '@tabler/icons-react';

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
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null);

  const refreshRules = useCallback(async (): Promise<void> => {
    setIsLoadingRules(true);
    setRulesError(null);
    try {
      const response = await listRules(token);
      setRules(response);
      setSelectedRuleId((current) => current ?? response[0]?.id ?? null);
    } catch (caughtError: unknown) {
      setRulesError(caughtError instanceof Error ? caughtError.message : 'Failed to load rules');
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
    setDeliveriesError(null);
    void listDeliveries(selectedRuleId, 20)
      .then((response) => {
        setDeliveries(response.data);
      })
      .catch((caughtError: unknown) => {
        setDeliveriesError(caughtError instanceof Error ? caughtError.message : 'Failed to load deliveries');
      })
      .finally(() => {
        setIsLoadingDeliveries(false);
      });
  }, [selectedRuleId]);

  return (
    <main className="min-h-[calc(100vh-5rem)] space-y-6 text-foreground">
      <header className="rounded-2xl border border-border/70 bg-card/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Routing control center</p>
            <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <IconRoute size={20} className="text-primary" />
              Forwarding Rules
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Configure rule-based webhook delivery, monitor outcomes, and keep endpoint routing predictable.
            </p>
          </div>
          <Button asChild variant="outline" className="h-9 border-border/70 bg-background/70">
            <Link href={`/console/${token}`}>Back to console</Link>
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            Token {token}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {deliveries.length} recent {deliveries.length === 1 ? 'delivery' : 'deliveries'}
          </Badge>
        </div>
      </header>

      <section className="space-y-4 rounded-2xl border border-border/70 bg-card/55 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Create Rule</h2>
            <p className="text-sm text-muted-foreground">Add a destination with optional method/body filters.</p>
          </div>
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
          <p className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
            Open the form to define routing filters and destination retries.
          </p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.35fr]">
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-lg font-medium">
              <IconListCheck size={18} className="text-primary" />
              Rules
            </h2>
            {isLoadingRules ? <span className="text-xs text-muted-foreground">Loading rules…</span> : null}
          </div>
          {rulesError ? <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{rulesError}</p> : null}
          <RuleList
            rules={rules}
            selectedRuleId={selectedRuleId}
            onSelectRule={(id) => {
              setSelectedRuleId(id);
            }}
          />
        </div>
        <div className="space-y-3 rounded-2xl border border-border/70 bg-card/55 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-lg font-medium">
              <IconTable size={18} className="text-primary" />
              Delivery Log
            </h2>
            {isLoadingDeliveries ? <span className="text-xs text-muted-foreground">Loading deliveries…</span> : null}
          </div>
          {deliveriesError ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{deliveriesError}</p>
          ) : null}
          <DeliveryLog deliveries={deliveries} />
        </div>
      </section>
    </main>
  );
}
