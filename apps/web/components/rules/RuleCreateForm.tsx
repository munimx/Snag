'use client';

import { useState } from 'react';

import { createRule } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface RuleCreateFormProps {
  token: string;
  onCreated: () => void;
  onCancel?: () => void;
}

export function RuleCreateForm({ token, onCreated, onCancel }: RuleCreateFormProps): React.JSX.Element {
  const [name, setName] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [filterBodyKey, setFilterBodyKey] = useState<string>('');
  const [filterBodyVal, setFilterBodyVal] = useState<string>('');
  const [destinationUrl, setDestinationUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRule = async (): Promise<void> => {
    if (isSubmitting || destinationUrl.trim() === '') {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage(null);
    setError(null);
    try {
      await createRule(token, {
        name: name.trim() || undefined,
        filterMethod: filterMethod.trim() || undefined,
        filterBodyKey: filterBodyKey.trim() || undefined,
        filterBodyVal: filterBodyVal.trim() || undefined,
        destinationUrl: destinationUrl.trim(),
      });
      setName('');
      setFilterMethod('');
      setFilterBodyKey('');
      setFilterBodyVal('');
      setDestinationUrl('');
      setSuccessMessage('Rule created successfully.');
      onCreated();
      onCancel?.();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to create rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-border/70 bg-secondary/25 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="rule-name">
            Name
          </label>
          <Input
            id="rule-name"
            className="bg-background/70"
            placeholder="Order intake"
            value={name}
            disabled={isSubmitting}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="destination-url">
            Destination URL
          </label>
          <Input
            id="destination-url"
            className="bg-background/70"
            placeholder="https://example.com/webhooks"
            value={destinationUrl}
            disabled={isSubmitting}
            onChange={(event) => setDestinationUrl(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="filter-method">
            Method Filter (optional)
          </label>
          <Input
            id="filter-method"
            className="bg-background/70"
            placeholder="POST"
            value={filterMethod}
            disabled={isSubmitting}
            onChange={(event) => setFilterMethod(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="filter-body-key">
            Body Key (optional)
          </label>
          <Input
            id="filter-body-key"
            className="bg-background/70"
            placeholder="event_type"
            value={filterBodyKey}
            disabled={isSubmitting}
            onChange={(event) => setFilterBodyKey(event.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-[0.08em] text-muted-foreground" htmlFor="filter-body-value">
          Body Value (optional)
        </label>
        <Input
          id="filter-body-value"
          className="bg-background/70"
          placeholder="checkout.completed"
          value={filterBodyVal}
          disabled={isSubmitting}
          onChange={(event) => setFilterBodyVal(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={isSubmitting || destinationUrl.trim() === ''}
          onClick={() => {
            void handleCreateRule();
          }}
        >
          {isSubmitting ? 'Creating rule…' : 'Create Rule'}
        </Button>
        {onCancel ? (
          <Button
            variant="outline"
            onClick={() => {
              onCancel();
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        ) : null}
        {destinationUrl.trim() === '' ? <p className="text-xs text-muted-foreground">Destination URL is required.</p> : null}
      </div>
      {successMessage ? <p className="text-sm text-emerald-400">{successMessage}</p> : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
