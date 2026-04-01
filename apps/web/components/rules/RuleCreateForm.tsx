'use client';

import { useState } from 'react';

import { createRule } from '../../lib/api';

interface RuleCreateFormProps {
  token: string;
  onCreated: () => void;
}

export function RuleCreateForm({ token, onCreated }: RuleCreateFormProps): React.JSX.Element {
  const [name, setName] = useState<string>('');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [filterBodyKey, setFilterBodyKey] = useState<string>('');
  const [filterBodyVal, setFilterBodyVal] = useState<string>('');
  const [destinationUrl, setDestinationUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);
        void createRule(token, {
          name: name.trim() || undefined,
          filterMethod: filterMethod.trim() || undefined,
          filterBodyKey: filterBodyKey.trim() || undefined,
          filterBodyVal: filterBodyVal.trim() || undefined,
          destinationUrl: destinationUrl.trim(),
        })
          .then(() => {
            setName('');
            setFilterMethod('');
            setFilterBodyKey('');
            setFilterBodyVal('');
            setDestinationUrl('');
            onCreated();
          })
          .catch((caughtError: unknown) => {
            setError(caughtError instanceof Error ? caughtError.message : 'Failed to create rule');
          })
          .finally(() => {
            setIsSubmitting(false);
          });
      }}
      style={{ display: 'grid', gap: 8, marginBottom: 16 }}
    >
      <input placeholder="Rule name" value={name} onChange={(event) => setName(event.target.value)} />
      <input
        placeholder="Filter method (optional)"
        value={filterMethod}
        onChange={(event) => setFilterMethod(event.target.value)}
      />
      <input
        placeholder="Filter body key (optional)"
        value={filterBodyKey}
        onChange={(event) => setFilterBodyKey(event.target.value)}
      />
      <input
        placeholder="Filter body value (optional)"
        value={filterBodyVal}
        onChange={(event) => setFilterBodyVal(event.target.value)}
      />
      <input
        placeholder="Destination URL"
        value={destinationUrl}
        onChange={(event) => setDestinationUrl(event.target.value)}
        required
      />
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Creating…' : 'Create rule'}
      </button>
      {error ? <p style={{ color: '#ff8a8a' }}>{error}</p> : null}
    </form>
  );
}
