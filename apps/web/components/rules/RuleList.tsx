import type { ForwardRule } from '@snag/shared/types';

interface RuleListProps {
  rules: ForwardRule[];
  selectedRuleId: string | null;
  onSelectRule: (id: string) => void;
}

export function RuleList({ rules, selectedRuleId, onSelectRule }: RuleListProps): React.JSX.Element {
  if (rules.length === 0) {
    return <p style={{ color: '#9fb0d1' }}>No forwarding rules yet.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {rules.map((rule) => {
        const isSelected = selectedRuleId === rule.id;
        return (
          <button
            key={rule.id}
            onClick={() => {
              onSelectRule(rule.id);
            }}
            style={{
              textAlign: 'left',
              border: isSelected ? '1px solid #5b82ff' : '1px solid #2e3a5e',
              borderRadius: 8,
              padding: 10,
              background: isSelected ? '#17264d' : '#111a33',
              color: '#d7e5ff',
            }}
          >
            <div style={{ fontWeight: 600 }}>{rule.name ?? 'Untitled rule'}</div>
            <div style={{ fontSize: 12, color: '#9fb0d1' }}>{rule.destinationUrl}</div>
            <div style={{ fontSize: 12, color: '#9fb0d1' }}>
              {rule.enabled ? 'Enabled' : 'Disabled'} · Method {rule.filterMethod ?? 'ANY'}
            </div>
          </button>
        );
      })}
    </div>
  );
}
