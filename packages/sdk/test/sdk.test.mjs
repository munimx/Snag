import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CapturedRequest } from '../dist/esm/captured-request.js';
import { Endpoint } from '../dist/esm/endpoint.js';
import { SnagClient } from '../dist/esm/snag-client.js';

const sampleCaptured = {
  id: 'req_1',
  endpointId: 'ep_1',
  method: 'POST',
  path: '/webhook',
  query: { source: 'stripe' },
  headers: { 'content-type': 'application/json' },
  body: '{"ok":true}',
  bodyType: 'application/json',
  status: 200,
  latencyMs: 12,
  receivedAt: '2026-01-01T00:00:00.000Z',
};

test('SnagClient defaults to the hosted Snag API', async () => {
  const fetchFn = async () => new Response('not found', { status: 404 });
  const client = new SnagClient({
    fetchFn,
    websocketFactory: () => new FakeSocket(),
  });

  const endpoint = client.getEndpoint('token-hosted');
  assert.equal(endpoint.url, 'https://snag-server.fly.dev/h/token-hosted');
});

test('SnagClient.createEndpoint falls back to local token and getEndpoint validates input', async () => {
  const fetchFn = async () => new Response('not found', { status: 404 });
  const client = new SnagClient({
    baseUrl: 'http://localhost:8080',
    fetchFn,
    websocketFactory: () => new FakeSocket(),
  });

  const created = await client.createEndpoint();
  assert.equal(created.token.startsWith('sdk_'), true);
  assert.equal(created.url.startsWith('http://localhost:8080/h/'), true);

  const endpoint = client.getEndpoint('token-abc');
  assert.equal(endpoint.token, 'token-abc');

  assert.throws(() => client.getEndpoint('   '), /cannot be empty/i);
});

test('Endpoint.listRequests returns CapturedRequest helpers', async () => {
  const fetchFn = async () =>
    new Response(
      JSON.stringify({
        data: [sampleCaptured],
        meta: { total: 1, limit: 50, nextCursor: null, hasMore: false },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );

  const endpoint = new Endpoint(
    { token: 'token-1', url: 'http://localhost:8080/h/token-1' },
    {
      baseUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080/ws',
      fetchFn,
      websocketFactory: () => new FakeSocket(),
    },
  );

  const listed = await endpoint.listRequests({ limit: 1 });
  assert.equal(listed.data.length, 1);
  assert.equal(listed.data[0] instanceof CapturedRequest, true);
  assert.equal(listed.data[0].id, 'req_1');
});

test('Endpoint.delete supports request delete and endpoint delete', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, method: init?.method ?? 'GET' });
    return new Response(null, { status: 204 });
  };

  const endpoint = new Endpoint(
    { token: 'token-2', url: 'http://localhost:8080/h/token-2' },
    {
      baseUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080/ws',
      fetchFn,
      websocketFactory: () => new FakeSocket(),
    },
  );

  await endpoint.delete('req_1');
  await endpoint.delete();

  assert.equal(calls[0].url, 'http://localhost:8080/api/requests/req_1');
  assert.equal(calls[1].url, 'http://localhost:8080/api/endpoints/token-2');
});

test('Endpoint.waitForRequest supports long-poll and ws timeout mode', async () => {
  const fetchFn = async () =>
    new Response(JSON.stringify(sampleCaptured), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const ws = new FakeSocket();

  const endpoint = new Endpoint(
    { token: 'token-3', url: 'http://localhost:8080/h/token-3' },
    {
      baseUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080/ws',
      fetchFn,
      websocketFactory: () => ws,
    },
  );

  const fromLongPoll = await endpoint.waitForRequest();
  assert.equal(fromLongPoll?.id, 'req_1');

  const pending = endpoint.waitForRequest({ timeout: 500 });
  ws.emit('open');
  ws.emit('message', JSON.stringify({ type: 'request_captured', request: { ...sampleCaptured, id: 'req_ws' } }));
  const fromWs = await pending;
  assert.equal(fromWs?.id, 'req_ws');
});

test('Endpoint.onRequest subscribes and unsubscribe closes socket', async () => {
  const ws = new FakeSocket();
  const fetchFn = async () => new Response('{}', { status: 200 });
  const endpoint = new Endpoint(
    { token: 'token-4', url: 'http://localhost:8080/h/token-4' },
    {
      baseUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080/ws',
      fetchFn,
      websocketFactory: () => ws,
    },
  );

  const seen = [];
  const unsubscribe = endpoint.onRequest((req) => seen.push(req.id));
  ws.emit('open');
  ws.emit('message', JSON.stringify({ type: 'request_captured', request: { ...sampleCaptured, id: 'req_live' } }));
  assert.deepEqual(seen, ['req_live']);

  unsubscribe();
  assert.equal(ws.closed, true);
});

test('CapturedRequest.replay and toCurl work', async () => {
  const calls = [];
  const fetchFn = async (url, init) => {
    calls.push({ url, init });
    return new Response(
      JSON.stringify({
        id: 'rep_1',
        targetUrl: 'http://localhost:3000/hook',
        responseStatus: 200,
        latencyMs: 11,
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const captured = new CapturedRequest('http://localhost:8080', fetchFn, sampleCaptured);

  const replay = await captured.replay('http://localhost:3000/hook');
  assert.equal(replay.responseStatus, 200);
  assert.equal(calls.length, 1);
  assert.equal(String(calls[0].url).includes('/api/requests/req_1/replay'), true);

  const curl = captured.toCurl('https://snag.dev/h/token-1');
  assert.equal(curl.includes('curl -X POST'), true);
  assert.equal(curl.includes('--data-raw'), true);
});

class FakeSocket {
  constructor() {
    this.listeners = new Map();
    this.sent = [];
    this.closed = false;
  }

  addEventListener(event, listener) {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  removeEventListener(event, listener) {
    const list = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      list.filter((entry) => entry !== listener),
    );
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
  }

  emit(event, payload) {
    const list = this.listeners.get(event) ?? [];
    for (const listener of list) {
      if (event === 'message') {
        listener({ data: payload });
      } else if (event === 'error') {
        listener(payload ?? new Error('socket error'));
      } else {
        listener();
      }
    }
  }
}
