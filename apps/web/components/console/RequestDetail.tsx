'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';
import { IconCheck, IconCopy, IconTerminal } from '@tabler/icons-react';

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

function getMethodVariant(method: string): 'get' | 'post' | 'put' | 'patch' | 'delete' | 'default' {
  const methodLower = method.toLowerCase();
  if (methodLower === 'get') return 'get';
  if (methodLower === 'post') return 'post';
  if (methodLower === 'put') return 'put';
  if (methodLower === 'patch') return 'patch';
  if (methodLower === 'delete') return 'delete';
  return 'default';
}

export function RequestDetail({ request }: RequestDetailProps): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  if (!request) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-outline-variant/20 bg-surface-high/30 p-6 text-sm text-muted-foreground">
        <div className="rounded-lg border border-dashed border-outline-variant/25 bg-surface-low/40 px-5 py-4">
          Select a request to view details.
        </div>
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
    <div className="space-y-5 rounded-xl border border-outline-variant/20 bg-surface-high/30 p-5">
      {/* Request header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={getMethodVariant(request.method)}>{request.method}</Badge>
          <h2 className="font-mono text-sm text-foreground sm:text-base">{request.path}</h2>
        </div>
        <p className="font-label text-[11px] uppercase tracking-extra-wide text-muted-foreground">
          Received {new Date(request.receivedAt).toLocaleString()}
        </p>
      </div>

      {/* Tabs for headers/body/query */}
      <Tabs defaultValue="headers" className="mt-3">
        <TabsList>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
        </TabsList>
        <TabsContent value="headers" className="rounded-lg border border-outline-variant/15 bg-surface-low/30 p-4">
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
                    <TableCell className="font-mono text-[11px] text-primary/80">{key}</TableCell>
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
        <TabsContent value="body" className="rounded-lg border border-outline-variant/15 bg-surface-low/30 p-4">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-surface-lowest/80 p-4 font-mono text-xs leading-relaxed">
            {request.body ?? 'No body'}
          </pre>
        </TabsContent>
        <TabsContent value="query" className="rounded-lg border border-outline-variant/15 bg-surface-low/30 p-4">
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
                    <TableCell className="font-mono text-xs text-primary/80">{key}</TableCell>
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

      {/* cURL section */}
      <section className="grid gap-4 rounded-lg border border-outline-variant/15 bg-surface-low/30 p-4 lg:grid-cols-[minmax(0,1fr)_200px]">
        <div className="space-y-3">
          <h3 className="inline-flex items-center gap-2 font-label text-xs font-medium uppercase tracking-extra-wide text-muted-foreground">
            <IconTerminal size={14} className="text-primary/60" />
            cURL command
          </h3>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-surface-lowest/80 p-4 font-mono text-xs leading-relaxed text-foreground/90">
            {curl}
          </pre>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => {
              void onCopyCurl();
            }}
          >
            {copied ? (
              <span className="inline-flex items-center gap-2">
                <IconCheck size={14} className="text-success" />
                Copied!
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <IconCopy size={14} />
                Copy cURL
              </span>
            )}
          </Button>
          {copyError ? <p className="text-xs text-destructive">{copyError}</p> : null}
        </div>
      </section>

      {/* Replay panel */}
      <ReplayPanel request={request} />
    </div>
  );
}
