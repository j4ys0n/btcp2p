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
