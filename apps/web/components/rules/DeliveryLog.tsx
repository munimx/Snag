import type { Delivery } from '@snag/shared/types';

import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface DeliveryLogProps {
  deliveries: Delivery[];
}

function getStatusVariant(status: number | null): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === null) {
    return 'outline';
  }
  if (status >= 200 && status < 300) {
    return 'secondary';
  }
  if (status >= 400) {
    return 'destructive';
  }
  return 'outline';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown time';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function DeliveryLog({ deliveries }: DeliveryLogProps): React.JSX.Element {
  if (deliveries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
        No delivery attempts yet. Select a rule with traffic to inspect delivery results.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-secondary/25">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/20 hover:bg-secondary/20">
            <TableHead>Attempt</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Latency</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="font-medium">#{delivery.attempt}</TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(delivery.status)} className="font-mono text-xs">
                  {delivery.status ?? 'N/A'}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs">{delivery.latencyMs ?? 0}ms</TableCell>
              <TableCell>{formatDateTime(delivery.createdAt)}</TableCell>
              <TableCell className="max-w-[280px] truncate text-sm">
                {delivery.error ? <span className="text-destructive">{delivery.error}</span> : <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
