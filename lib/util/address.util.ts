import * as bitcoinjslib from 'bitcoinjs-lib';
import * as bitcoinjslibClassify from 'bitcoinjs-lib/src/classify';

import { StartOptions } from '../interfaces/peer.interface';

const bitcoin = {...bitcoinjslib, ...{classify: bitcoinjslibClassify}};
let network = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
}

export class AddressUtil {
  constructor(private options: StartOptions) {
    network.pubKeyHash = this.options.network.pubKeyVersion;
    network.scriptHash = this.options.network.scriptVersion;
  }

  public classifyHex(hex: string): string {
    const hexBuffer = Buffer.from(hex, 'hex')
    let type: string;
    try {
      type = bitcoin.classify.output(hexBuffer);
    } catch(e) {
      // invalid hex scripts start with '6a' which translates to OP_RETURN
      type = 'invalid';
    }
    return type;
  }

  public encodePubKeyAddress(hex: string): string {
    const hexBuff = Buffer.from(hex, 'hex');
    const bytes = parseInt(hexBuff.slice(0,1).toString('hex'), 16);
    const pubkey = hexBuff.slice(1, 1 + bytes);
    const hash160 = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(pubkey));
    return bitcoin.address.toBase58Check(hash160, network.pubKeyHash)
  }

  public encodeMultisigAddress(hex: string): string {
    const hexBuff = Buffer.from(hex, 'hex');
    const hash160 = bitcoin.crypto.ripemd160(bitcoin.crypto.sha256(hexBuff));
    return bitcoin.address.toBase58Check(hash160, network.scriptHash)
  }

  public encodeAddress(type: string, hex: string): string {
    let addr = '';
    if (type === 'multisig') {
      addr = this.encodeMultisigAddress(hex);
    } else if (type === 'pubkey') {
      addr = this.encodePubKeyAddress(hex);
    } else if (type === 'pubkeyhash') {
      addr = bitcoin.address.fromOutputScript(Buffer.from(hex,'hex'), network);
    } else if (type === 'witnesscommitment') {
      // do nothing
    } else if (type === 'nonstandard') {
      // do nothing
    } else if (type === 'nulldata') {
      // do nothing
    } else if (type === 'invalid') {
      // do nothing
    } else {
      addr = bitcoin.address.fromOutputScript(Buffer.from(hex,'hex'), network);
    }
    return addr;
  }

  public classifyAndEncodeAddress(hex: string): string {
    const type = this.classifyHex(hex);
    return this.encodeAddress(type, hex);
  }
}
