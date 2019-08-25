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
All files                |    77.84 |    60.65 |    79.93 |    79.24 |                   |
 lib                     |    80.36 |    73.33 |    81.08 |    80.36 |                   |
  btcp2p.ts              |    80.36 |    73.33 |    81.08 |    80.36 |... 28,329,330,331 |
 lib/blocks              |    73.81 |    61.11 |    74.47 |     74.4 |                   |
  block-handler.ts       |    77.78 |    57.14 |    77.78 |    80.77 |... 71,72,74,80,81 |
  block-parser.ts        |    75.68 |      100 |       80 |    75.68 |... 08,109,110,121 |
  blocks.ts              |    70.97 |    63.64 |    71.43 |    70.97 |... 66,167,199,239 |
 lib/events              |    82.81 |    83.33 |    75.71 |    82.72 |                   |
  events.ts              |    82.81 |    83.33 |    75.71 |    82.72 |... 41,342,343,344 |
 lib/message             |       80 |    56.67 |    88.89 |       80 |                   |
  message.consts.ts      |      100 |      100 |      100 |      100 |                   |
  message.handlers.ts    |    71.25 |    36.36 |    88.89 |    71.25 |... 51,152,153,155 |
  message.ts             |    83.54 |    68.42 |       88 |    83.54 |... 74,277,278,279 |
 lib/peers               |    96.97 |      100 |      100 |    96.97 |                   |
  peers.ts               |    96.97 |      100 |      100 |    96.97 |                17 |
 lib/transactions        |    83.46 |    66.67 |    83.33 |    83.46 |                   |
  transaction-handler.ts |    66.67 |      100 |       50 |    66.67 |... 24,25,29,30,31 |
  transaction-parser.ts  |    86.14 |       60 |    91.67 |    86.14 |... 17,118,119,195 |
  transactions.ts        |      100 |      100 |      100 |      100 |                   |
 lib/util                |    67.84 |    56.76 |       80 |    74.23 |                   |
  address.util.ts        |       60 |    57.14 |    66.67 |    62.79 |... 54,55,56,61,64 |
  db.util.ts             |    65.49 |    56.72 |    77.14 |    78.05 |... 10,112,126,144 |
  general.util.ts        |    76.81 |      100 |    93.75 |    76.81 |... 47,51,52,53,88 |
-------------------------|----------|----------|----------|----------|-------------------|
```
