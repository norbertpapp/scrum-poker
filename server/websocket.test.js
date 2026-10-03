import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import WebSocket from 'ws';
import { ScrumPokerServer } from './websocket.js';

const createServer = async (t, options = {}) => {
  const server = new ScrumPokerServer(options);
  server.start(0);
  await once(server.wss, 'listening');
  t.after(async () => {
    for (const client of server.wss.clients) client.terminate();
    await new Promise(resolve => server.wss.close(resolve));
  });
  return server;
};

const openClient = async (server) => {
  const client = new WebSocket(`ws://127.0.0.1:${server.wss.address().port}`);
  await once(client, 'open');
  return client;
};

const nextState = (client, timeoutMs = 5000) => new Promise((resolve, reject) => {
  const onMessage = (raw) => {
    const message = JSON.parse(raw.toString());
    if (message.type !== 'ROOM_STATE') return;
    clearTimeout(timeout);
    client.off('message', onMessage);
    resolve(message.data);
  };
  const timeout = setTimeout(() => {
    client.off('message', onMessage);
    reject(new Error('Timed out waiting for ROOM_STATE'));
  }, timeoutMs);
  client.on('message', onMessage);
});

const sendAndRead = (client, type, data) => {
  const state = nextState(client);
  client.send(JSON.stringify({ type, data }));
  return state;
};

const waitFor = async (condition) => {
  for (let i = 0; i < 100; i += 1) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail('Timed out waiting for server state');
};

test('nextState times out and removes its message listener', async () => {
  const client = new EventEmitter();
  const state = nextState(client, 20);
  client.emit('message', JSON.stringify({ type: 'PING_RECEIVED' }));
  await assert.rejects(state, /Timed out waiting for ROOM_STATE/);
  assert.equal(client.listenerCount('message'), 0);
});

test('reconnect restores votes and voting history after all sockets close', async (t) => {
  const server = await createServer(t, { disconnectGraceMs: 100 });
  const alice = await openClient(server);
  await sendAndRead(alice, 'JOIN_ROOM', { roomCode: 'TEST', playerName: 'Alice', playerId: 'alice' });
  const bob = await openClient(server);
  await sendAndRead(bob, 'JOIN_ROOM', { roomCode: 'TEST', playerName: 'Bob', playerId: 'bob' });
  await sendAndRead(alice, 'VOTE', { vote: 3 });
  await sendAndRead(alice, 'REVEAL_VOTES', {});
  await sendAndRead(alice, 'RESET_VOTES', {});
  await sendAndRead(alice, 'VOTE', { vote: 5 });

  alice.close();
  bob.close();
  await Promise.all([once(alice, 'close'), once(bob, 'close')]);
  await waitFor(() => !server.clients.size);

  const rejoinedAlice = await openClient(server);
  const state = await sendAndRead(rejoinedAlice, 'JOIN_ROOM', { roomCode: 'TEST', playerName: 'Alice', playerId: 'alice' });
  assert.equal(state.votingHistory.length, 1);
  assert.equal(state.participants.length, 2);
  assert.deepEqual(state.participants.find(p => p.id === 'alice'), {
    id: 'alice', name: 'Alice', hasVoted: true, connected: true, vote: null
  });

  await delay(120);
  assert.equal(server.rooms.get('TEST')?.participants.size, 1);
  assert.equal(server.rooms.get('TEST')?.participants.get('alice')?.vote, 5);
  assert.equal(server.rooms.get('TEST')?.votingHistory.length, 1);
});

test('explicit leave removes empty rooms', async (t) => {
  const server = await createServer(t);
  const client = await openClient(server);
  await sendAndRead(client, 'JOIN_ROOM', { roomCode: 'TEST', playerName: 'Alice', playerId: 'alice' });
  client.send(JSON.stringify({ type: 'LEAVE_ROOM', data: {} }));
  await waitFor(() => !server.rooms.has('TEST'));
});

test('disconnected participants expire after grace period', async (t) => {
  const server = await createServer(t, { disconnectGraceMs: 50 });
  const client = await openClient(server);
  await sendAndRead(client, 'JOIN_ROOM', { roomCode: 'TEST', playerName: 'Alice', playerId: 'alice' });
  client.close();
  await once(client, 'close');
  await waitFor(() => !server.rooms.has('TEST'));
});

test('repeat joins and replaced sockets do not reset votes or evict the new connection', async (t) => {
  const server = await createServer(t);
  const alice = await openClient(server);
  const join = { roomCode: 'TEST', playerName: 'Alice', playerId: 'alice' };
  await sendAndRead(alice, 'JOIN_ROOM', join);
  await sendAndRead(alice, 'VOTE', { vote: 8 });
  const repeated = await sendAndRead(alice, 'JOIN_ROOM', join);
  assert.equal(repeated.participants[0].hasVoted, true);

  const replacement = await openClient(server);
  const oldClose = once(alice, 'close');
  const state = await sendAndRead(replacement, 'JOIN_ROOM', join);
  await oldClose;
  assert.equal(state.participants.length, 1);
  assert.equal(server.rooms.get('TEST').participants.get('alice').ws, server.clients.keys().next().value);
  assert.equal(server.rooms.get('TEST').participants.get('alice').vote, 8);
  assert.equal((await sendAndRead(replacement, 'VOTE', { vote: 13 })).participants[0].hasVoted, true);
  assert.equal(server.rooms.get('TEST').participants.get('alice').vote, 13);
});

test('server sends heartbeat pings on idle connections', async (t) => {
  const server = await createServer(t, { heartbeatIntervalMs: 20 });
  const client = await openClient(server);
  await once(client, 'ping', { signal: AbortSignal.timeout(300) });
});
