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
  const [error, setError] = useState<string | null>(null);

  const handleCreateRule = async (): Promise<void> => {
    if (isSubmitting || destinationUrl.trim() === '') {
      return;
    }

    setIsSubmitting(true);
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
      onCreated();
      onCancel?.();
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to create rule');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Rule name" value={name} onChange={(event) => setName(event.target.value)} />
        <Input
          placeholder="Destination URL"
          value={destinationUrl}
          onChange={(event) => setDestinationUrl(event.target.value)}
        />
        <Input
          placeholder="Filter method (optional)"
          value={filterMethod}
          onChange={(event) => setFilterMethod(event.target.value)}
        />
        <Input
          placeholder="Filter body key (optional)"
          value={filterBodyKey}
          onChange={(event) => setFilterBodyKey(event.target.value)}
        />
      </div>
      <Input
        placeholder="Filter body value (optional)"
        value={filterBodyVal}
        onChange={(event) => setFilterBodyVal(event.target.value)}
      />
      <div className="flex items-center gap-2">
        <Button
          disabled={isSubmitting || destinationUrl.trim() === ''}
          onClick={() => {
            void handleCreateRule();
          }}
        >
          {isSubmitting ? 'Creating…' : 'Create Rule'}
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
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
