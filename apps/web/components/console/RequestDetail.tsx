'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';
import { IconCheck, IconCopy, IconWorldWww } from '@tabler/icons-react';

import { copyText, toCurl } from '../../lib/curl';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ReplayPanel } from './ReplayPanel';

interface RequestDetailProps {
  request: CapturedRequest | null;
}

export function RequestDetail({ request }: RequestDetailProps): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!request) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-border/60 bg-card/55 p-4 text-sm text-muted-foreground">
        Select a request to view details.
      </div>
    );
  }

  const curl = toCurl(request);

  const onCopyCurl = async (): Promise<void> => {
    try {
      await copyText(curl);
      setCopyError(null);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (caughtError: unknown) {
      const message = caughtError instanceof Error ? caughtError.message : 'Copy failed';
      setCopyError(message);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border/65 bg-card/55 p-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border-primary/55 bg-primary/15 text-primary">{request.method}</Badge>
          <h2 className="font-mono text-sm text-foreground sm:text-base">{request.path}</h2>
        </div>
        <p className="text-xs text-muted-foreground">Received {new Date(request.receivedAt).toLocaleString()}</p>
      </div>

      <Tabs defaultValue="headers" className="mt-2">
        <TabsList className="bg-secondary/45">
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
        </TabsList>
        <TabsContent value="headers" className="rounded-md border border-border/60 bg-secondary/30 p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Header</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(request.headers).length > 0 ? (
                Object.entries(request.headers).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-mono text-[11px]">{key}</TableCell>
                    <TableCell className="font-mono text-[11px]">{value}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No headers available.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="body" className="rounded-md border border-border/60 bg-secondary/30 p-3">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-background/65 p-3 font-mono text-xs">
            {request.body ?? 'No body'}
          </pre>
        </TabsContent>
        <TabsContent value="query" className="rounded-md border border-border/60 bg-secondary/30 p-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Param</TableHead>
                <TableHead>Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(request.query).length > 0 ? (
                Object.entries(request.query).map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-mono text-xs">{key}</TableCell>
                    <TableCell className="font-mono text-xs">{value}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No query parameters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <section className="grid gap-4 rounded-md border border-border/60 bg-secondary/20 p-3 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="space-y-2">
          <h3 className="inline-flex items-center gap-2 text-sm font-medium">
            <IconWorldWww size={14} />
            cURL
          </h3>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-background/65 p-3 font-mono text-xs">
            {curl}
          </pre>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-between border-border/70 bg-background/50"
            onClick={() => {
              void onCopyCurl();
            }}
          >
            {copied ? (
              <span className="inline-flex items-center gap-2">
                <IconCheck size={14} />
                Copied
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <IconCopy size={14} />
                Copy as cURL
              </span>
            )}
          </Button>
          {copyError ? <p className="text-xs text-red-400">{copyError}</p> : null}
        </div>
      </section>
      <ReplayPanel request={request} />
    </div>
  );
}
