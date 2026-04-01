import type { CapturedRequest } from '@snag/shared/types';
import { Box, Text, useApp, useInput } from 'ink';
import React, { useMemo, useState } from 'react';

interface ListenScreenProps {
  requests: CapturedRequest[];
  token: string;
  publicUrl: string;
}

export function ListenScreen({ requests, token, publicUrl }: ListenScreenProps): React.JSX.Element {
  const { exit } = useApp();
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showDetail, setShowDetail] = useState<boolean>(true);

  const boundedIndex = useMemo(() => {
    if (requests.length === 0) {
      return 0;
    }
    if (selectedIndex >= requests.length) {
      return requests.length - 1;
    }
    return selectedIndex;
  }, [requests, selectedIndex]);

  const selected = requests[boundedIndex] ?? null;

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      exit();
      return;
    }

    if (key.upArrow || input === 'k') {
      setSelectedIndex((current) => Math.max(0, current - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((current) => Math.min(requests.length - 1, current + 1));
      return;
    }

    if (key.return) {
      setShowDetail((current) => !current);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="green">Snag listen</Text>
      <Text>Token: {token}</Text>
      <Text>Public URL: {publicUrl}</Text>
      <Text dimColor>Keys: ↑/↓ or j/k to select, Enter to toggle detail, q to quit</Text>
      <Box marginTop={1} borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
        {requests.length === 0 ? (
          <Text dimColor>Waiting for requests…</Text>
        ) : (
          requests.map((request, index) => {
            const isSelected = index === boundedIndex;
            return (
              <Text key={request.id} color={isSelected ? 'yellow' : undefined}>
                {isSelected ? '› ' : '  '}
                {request.method} {request.path} [{request.id.slice(0, 8)}]
              </Text>
            );
          })
        )}
      </Box>

      {showDetail && selected ? (
        <Box marginTop={1} borderStyle="round" borderColor="magenta" flexDirection="column" paddingX={1}>
          <Text color="magenta">Detail</Text>
          <Text>ID: {selected.id}</Text>
          <Text>
            {selected.method} {selected.path}
          </Text>
          <Text>Status: {selected.status ?? 'N/A'}</Text>
          <Text>Received: {selected.receivedAt}</Text>
          <Text>Body: {selected.body ?? '<empty>'}</Text>
        </Box>
      ) : null}
    </Box>
  );
}
