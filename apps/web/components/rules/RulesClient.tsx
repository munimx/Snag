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
      {/* Header */}
      <header className="glass rounded-xl border border-outline-variant/20 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <span className="font-label text-[11px] font-medium uppercase tracking-extra-wide text-muted-foreground">
              Routing control center
            </span>
            <h1 className="inline-flex items-center gap-3 text-2xl font-semibold tracking-tight">
              <IconRoute size={22} className="text-primary" />
              Forwarding Rules
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Configure rule-based webhook delivery, monitor outcomes, and keep endpoint routing predictable.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/console/${token}`}>Back to console</Link>
          </Button>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <code className="rounded-lg border border-outline-variant/20 bg-surface-lowest/80 px-3 py-1.5 font-mono text-sm text-primary">
            {token}
          </code>
          <Badge variant="secondary" className="font-mono text-xs">
            {rules.length} {rules.length === 1 ? 'rule' : 'rules'}
          </Badge>
          <Badge variant="secondary" className="font-mono text-xs">
            {deliveries.length} {deliveries.length === 1 ? 'delivery' : 'deliveries'}
          </Badge>
        </div>
      </header>

      {/* Create rule section */}
      <section className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-high/30 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Create Rule</h2>
            <p className="text-sm text-muted-foreground">Add a destination with optional method/body filters.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
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
          <p className="rounded-lg border border-dashed border-outline-variant/25 bg-surface-low/30 p-4 text-sm text-muted-foreground">
            Open the form to define routing filters and destination retries.
          </p>
        )}
      </section>

      {/* Rules + Delivery Log grid */}
      <section className="grid gap-4 xl:grid-cols-[1.1fr_1.35fr]">
        {/* Rules panel */}
        <div className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-high/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-lg font-medium">
              <IconListCheck size={18} className="text-primary" />
              Rules
            </h2>
            {isLoadingRules ? (
              <span className="font-label text-[10px] uppercase tracking-extra-wide text-muted-foreground animate-pulse">
                Loading...
              </span>
            ) : null}
          </div>
          {rulesError ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">
              {rulesError}
            </p>
          ) : null}
          <RuleList
            rules={rules}
            selectedRuleId={selectedRuleId}
            onSelectRule={(id) => {
              setSelectedRuleId(id);
            }}
          />
        </div>

        {/* Delivery log panel */}
        <div className="space-y-4 rounded-xl border border-outline-variant/20 bg-surface-high/30 p-6">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-lg font-medium">
              <IconTable size={18} className="text-primary" />
              Delivery Log
            </h2>
            {isLoadingDeliveries ? (
              <span className="font-label text-[10px] uppercase tracking-extra-wide text-muted-foreground animate-pulse">
                Loading...
              </span>
            ) : null}
          </div>
          {deliveriesError ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-sm text-destructive">
              {deliveriesError}
            </p>
          ) : null}
          <DeliveryLog deliveries={deliveries} />
        </div>
      </section>
    </main>
  );
}
