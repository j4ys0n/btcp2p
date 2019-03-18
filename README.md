# BTCP2P

A light client that can connect to and interact with any crypto p2p network based on the bitcoin protocol.


## Usage

```
import { BTCP2P } from 'btcp2p';

addListeners(peer: BTCP2P) {
  peer.on('connect', (e) => {
    const msg = 'connected to: '  + this.options.host;
    console.log(msg);
  });

  peer.on('disconnect', (e) => {
    const msg = 'disconnected!';
    console.log(msg);
  });

  peer.on('version', (e) => {
    const msg = e;
    console.log(msg);
  });

  peer.on('error', (e) => {
    console.log({type: 'error', text: e.message});
  });

  peer.on('block', (e) => {
    const msg = 'block: ' + e.hash;
    console.log(msg);
  });

  peer.on('peer_message', (e) => {
    switch (e.command) {
      case 'inv':
        if (e.payload.type !== 15 && e.payload.type !== 7) {
          const msg = 'peer message: ' +  e.command + ' - type: ' + e.payload.type;
          console.log(msg);
        }
        break;
      default:
        const msg = 'peer message: ' + e.command;
        console.log(msg);
        break;
    }
  });

  peer.on('sent_message', (e) => {
    let msg = '';
    if (e.payload) {
      if (e.payload.message) {
        msg = ' ' + e.payload.message;
      }
    }
    const m = 'message sent: ' + e.command + msg;
    console.log(m);
  });
}

const peer = new BTCP2P({
  name: 'litecoin',
	peerMagic: 'fbc0b6db',
	disableTransactions: true,
	host: '1.2.3.4',
	port: 9333,
	protocolVersion: 70015,
	persist: true,
});
addWorkerListeners(peer);
```
