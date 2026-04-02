import type { ForwardRule } from '@snag/shared/types';

import { cn } from '@/lib/utils';

import { Badge } from '../ui/badge';

interface RuleListProps {
  rules: ForwardRule[];
  selectedRuleId: string | null;
  onSelectRule: (id: string) => void;
}

function formatRuleTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function RuleList({ rules, selectedRuleId, onSelectRule }: RuleListProps): React.JSX.Element {
  if (rules.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        No forwarding rules yet. Create one above to route captured events.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {rules.map((rule) => {
        const isSelected = selectedRuleId === rule.id;
        return (
          <button
            key={rule.id}
            onClick={() => {
              onSelectRule(rule.id);
            }}
            className={cn(
              'space-y-3 rounded-xl border bg-secondary/30 p-4 text-left transition-colors hover:bg-secondary/50',
              isSelected
                ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/35 shadow-[0_0_18px_hsl(var(--primary)/0.18)]'
                : 'border-border/70',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{rule.name ?? 'Untitled rule'}</p>
              <div className="flex items-center gap-2">
                {isSelected ? (
                  <Badge variant="default" className="text-[11px] uppercase tracking-[0.08em]">
                    Selected
                  </Badge>
                ) : null}
                <Badge variant={rule.enabled ? 'secondary' : 'outline'}>{rule.enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
            </div>
            <p className="break-all rounded-md border border-border/60 bg-background/50 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
              {rule.destinationUrl}
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Method {rule.filterMethod ?? 'ANY'}</Badge>
              <Badge variant="outline">
                Body {rule.filterBodyKey && rule.filterBodyVal ? `${rule.filterBodyKey}=${rule.filterBodyVal}` : 'No filter'}
              </Badge>
              <Badge variant="outline">Retries {rule.retries}</Badge>
              <span>Created {formatRuleTime(rule.createdAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
