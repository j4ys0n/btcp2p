the most recent work is on the [beta branch](https://github.com/j4ys0n/btcp2p/tree/beta)

# BTCP2P

A light client that can connect to and interact with any crypto p2p network based on the bitcoin protocol.


## Usage

```
import { BTCP2P } from 'btcp2p';

const addListeners = (btcp2p: BTCP2P) => {
  btcp2p.client.on('connect', (e: any) => {
    console.log('** connected!')
    setTimeout(() => {
      peer.client.socket.end();
    }, 10000)
  })

  btcp2p.client.on('disconnect', (e: DisconnectEvent) => {
    peer.client.events.clearDisconnect();
    setTimeout(() => {
      done();
    }, 3000);
  });

  btcp2p.client.on('error', (e: ErrorEvent) => {
    console.log({type: 'error', text: e.message});
  });

  btcp2p.client.on('block', (e: Block | BlockZcash) => {
    const msg = 'block: ' + e.hash;
    console.log(msg);
  });

  btcp2p.client.on('peer_message', (e: PeerMessageEvent) => {
    console.log('peer_message', e);
  });

  btcp2p.client.on('sent_message', (e: PeerMessageEvent) => {
    console.log('sent_message', e);
  });
}

const peer = new BTCP2P({
  name: 'bitcoin',
  host: 'localhost',
  port: 8333,
  startServer: false,
  relayTransactions: false,
  persist: false,
  fetchMempool: false,
  skipBlockDownload: true,
  network: {
    protocol: 'bitcoin',
    magic: 'f9beb4d9',
    genesisTarget: '1d00ffff',
    genesisHash: '000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f',
    protocolVersion: 170001,
    pubKeyVersion: 0,
    scriptVersion: 5
  }
});
addListeners(peer);
```

## Most recent test results

```
-------------------------|----------|----------|----------|----------|-------------------|
File                     |  % Stmts | % Branch |  % Funcs |  % Lines | Uncovered Line #s |
-------------------------|----------|----------|----------|----------|-------------------|
All files                |    80.96 |    63.87 |    84.36 |    82.44 |                   |
 lib                     |    79.17 |    73.33 |    78.38 |    79.17 |                   |
  btcp2p.ts              |    79.17 |    73.33 |    78.38 |    79.17 |... 28,329,330,331 |
 lib/blocks              |    84.82 |    83.33 |    89.58 |    85.49 |                   |
  block-handler.ts       |    77.78 |    57.14 |    77.78 |    80.77 |... 71,72,74,80,81 |
  block-parser.ts        |    75.68 |      100 |       80 |    75.68 |... 08,109,110,121 |
  blocks.ts              |    93.02 |      100 |    96.55 |    93.02 |... 91,132,147,208 |
 lib/events              |    82.81 |    83.33 |    75.71 |    82.72 |                   |
  events.ts              |    82.81 |    83.33 |    75.71 |    82.72 |... 41,342,343,344 |
 lib/message             |       80 |       60 |    88.89 |       80 |                   |
  message.consts.ts      |      100 |      100 |      100 |      100 |                   |
  message.handlers.ts    |    71.25 |    45.45 |    88.89 |    71.25 |... 51,152,153,155 |
  message.ts             |    83.54 |    68.42 |       88 |    83.54 |... 74,277,278,279 |
 lib/peers               |    96.97 |      100 |      100 |    96.97 |                   |
  peers.ts               |    96.97 |      100 |      100 |    96.97 |                17 |
 lib/transactions        |    89.47 |    66.67 |    94.44 |    89.47 |                   |
  transaction-handler.ts |       75 |      100 |       75 |       75 | 17,24,25,29,30,31 |
  transaction-parser.ts  |    92.08 |       60 |      100 |    92.08 |... 17,118,119,195 |
  transactions.ts        |      100 |      100 |      100 |      100 |                   |
 lib/util                |    70.04 |    56.76 |    86.67 |     76.8 |                   |
  address.util.ts        |       60 |    57.14 |    66.67 |    62.79 |... 54,55,56,61,64 |
  db.util.ts             |    69.91 |    56.72 |    88.57 |    84.15 |... 97,110,126,144 |
  general.util.ts        |    76.81 |      100 |    93.75 |    76.81 |... 47,51,52,53,88 |
-------------------------|----------|----------|----------|----------|-------------------|
```
