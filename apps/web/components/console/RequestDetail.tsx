'use client';

import type { CapturedRequest } from '@snag/shared/types';
import { useState } from 'react';

import { copyText, toCurl } from '../../lib/curl';
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
    return <div className="p-4 text-sm text-muted-foreground">Select a request to view details.</div>;
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
    <div className="p-4">
      <h2 className="text-lg font-semibold">
        {request.method} {request.path}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Received: {new Date(request.receivedAt).toLocaleString()}</p>

      <Tabs defaultValue="headers" className="mt-4">
        <TabsList>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="query">Query</TabsTrigger>
        </TabsList>
        <TabsContent value="headers" className="rounded-md border border-border bg-muted/20 p-3">
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
                    <TableCell className="font-mono text-xs">{key}</TableCell>
                    <TableCell className="font-mono text-xs">{value}</TableCell>
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
        <TabsContent value="body" className="rounded-md border border-border bg-muted/20 p-3">
          <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-background p-3 font-mono text-xs">
            {request.body ?? 'No body'}
          </pre>
        </TabsContent>
        <TabsContent value="query" className="rounded-md border border-border bg-muted/20 p-3">
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

      <section className="mt-4 space-y-2 rounded-md border border-border bg-muted/20 p-3">
        <h3 className="text-sm font-medium">cURL</h3>
        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-background p-3 font-mono text-xs">
          {curl}
        </pre>
        <Button
          variant="outline"
          onClick={() => {
            void onCopyCurl();
          }}
        >
          {copied ? 'Copied!' : 'Copy as cURL'}
        </Button>
        {copyError ? <p className="text-sm text-red-400">{copyError}</p> : null}
      </section>
      <ReplayPanel request={request} />
    </div>
  );
}
