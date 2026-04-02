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
    return <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">No forwarding rules yet.</p>;
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
              'space-y-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/60',
              isSelected ? 'border-primary ring-1 ring-primary/40' : 'border-border',
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-foreground">{rule.name ?? 'Untitled rule'}</p>
              <Badge variant={rule.enabled ? 'secondary' : 'outline'}>{rule.enabled ? 'Enabled' : 'Disabled'}</Badge>
            </div>
            <p className="break-all text-sm text-muted-foreground">{rule.destinationUrl}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Method {rule.filterMethod ?? 'ANY'}</Badge>
              <Badge variant="outline">
                Body {rule.filterBodyKey && rule.filterBodyVal ? `${rule.filterBodyKey}=${rule.filterBodyVal}` : 'No filter'}
              </Badge>
              <span>Created {formatRuleTime(rule.createdAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
