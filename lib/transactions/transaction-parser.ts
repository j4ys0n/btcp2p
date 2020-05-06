import { MessageParser } from 'crypto-binary';

import { Utils } from '../util/general.util';
import { AddressUtil } from '../util/address.util';

import { StartOptions } from '../interfaces/peer.interface';
import { TxInvEvent } from '../interfaces/events.interface';
import {
  BitcoinTransaction, ZcashTransaction, TxInput, TxOutput,
  ShieldedInputs, ShieldedOutputs
} from '../interfaces/transactions.interface';

const SEGWIT_ACTIVATION_EPOCH = 1503539857; // height = 481824

export class TransactionParser {
  private addressUtil: AddressUtil;
  constructor(
    private util: Utils,
    private options: StartOptions
  ) {
    this.addressUtil = new AddressUtil(this.options);
  }

  parseTransactionInv(payload: Buffer): TxInvEvent {
    const mParser = new MessageParser(payload);
    const raw: Buffer = Buffer.allocUnsafe(36);
    payload.copy(raw);
    const version = parseInt(mParser.raw(4).reverse().toString('hex'), 16);
    const hash = mParser.raw(32).reverse().toString('hex');
    const txInv = {
      version,
      hash,
      raw
    }
    return txInv
  }

  parseTransactions(mParser: any, count: number = 0, blockTime: number): Array<BitcoinTransaction | ZcashTransaction> {
    if (count === 0) {
      count = mParser.readVarInt();
    }
    switch (this.options.network.protocol) {
      case 'bitcoin':
        return this.parseBitcoinTransactions(mParser, count, blockTime);
      case 'zcash':
        return this.parseZcashTransactions(mParser, count);
    }
    return [];
  }

  parseBitcoinTransactions(mParser: any, count: number, blockTime: number): Array<BitcoinTransaction> {
    const txes: Array<any> = [];
    for (let i = 0; i < count; i ++) {
      const bytesStart = mParser.pointerPosition();
      const version = mParser.raw(4).reverse().toString('hex');
      const witnessFlag = (
        mParser.readInt8() === 1 &&
        blockTime >= SEGWIT_ACTIVATION_EPOCH
      ) ? true : false;
      if (!witnessFlag) {
        mParser.incrPointer(-1);
      }
      const txIn = this.parseTransparentInputs(mParser);
      const txOut = this.parseTransparentOutputs(mParser);
      const witnesses = this.parseWitnesses(mParser, witnessFlag);
      const lockTime = mParser.readUInt32LE();

      const bytesEnd = mParser.pointerPosition();
      const rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
      const txid = this.util.sha256d(rawBytes).reverse().toString('hex');

      const tx = {
        txid,
        version,
        txIn,
        txOut,
        witnesses,
        lockTime
      }
      txes.push(tx);
    }
    return txes;
  }

  parseZcashTransactions(mParser: any, count: number): Array<ZcashTransaction> {
    const txes: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const bytesStart = mParser.pointerPosition();
      const header = mParser.raw(4).reverse().toString('hex');
      const nVersionGroupId = mParser.raw(4).reverse().toString('hex');
      const txIn = this.parseTransparentInputs(mParser);
      const txOut = this.parseTransparentOutputs(mParser);
      const lockTime = mParser.readUInt32LE();
      const nExpiryHeight = mParser.readUInt32LE();
      const saplingValueBalance = mParser.readUInt64LE();
      const shieldedInputs = this.parseShieldedInputs(mParser);
      const shieldedOutputs = this.parseShieldedOutputs(mParser);
      const nJoinSplits = mParser.readVarInt();
      const joinSplits = this.parseJoinSplits(mParser, nJoinSplits);
      const joinSplitPubKey = (nJoinSplits > 0) ?
        mParser.raw(32).reverse().toString('hex') : '';
      const joinSplitSig = (nJoinSplits > 0) ?
        mParser.raw(64).reverse().toString('hex') : '';
      const bindingSig = (shieldedInputs.length + shieldedOutputs.length > 0) ?
        mParser.raw(64).reverse().toString('hex') : '';

      const bytesEnd = mParser.pointerPosition();
      const rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
      const txid = this.util.sha256d(rawBytes).reverse().toString('hex');

      const tx = {
        txid,
        header,
        nVersionGroupId,
        txIn,
        txOut,
        lockTime,
        nExpiryHeight,
        saplingValueBalance,
        shieldedInputs,
        shieldedOutputs,
        joinSplits,
        joinSplitPubKey,
        joinSplitSig,
        bindingSig
      };
      txes.push(tx);
    }

    return txes;
  }

  parseWitnesses(mParser: any, witnessFlag: boolean): Array<string> {
    const wits: Array<any> = [];
    if (witnessFlag) {
      const witnessCount = mParser.readVarInt();
      for (let i = 0; i < witnessCount; i++) {
        const scriptLength = mParser.readVarInt();
        const witness = mParser.raw(scriptLength).reverse().toString('hex');
        wits.push(witness);
      }
    }
    return wits;
  }

  parseTransparentInputs(mParser: any): Array<TxInput> {
    const count = mParser.readVarInt();
    // console.log('tx in count:', count);
    const inputs: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const input = {
        txid: mParser.raw(32).reverse().toString('hex'),
        outpointIndex: mParser.readUInt32LE(),
        signatureScript: mParser.raw(mParser.readVarInt()).reverse().toString('hex'),
        sequence: mParser.raw(4).reverse().toString('hex')
        // or sequence: mParser.readUInt32LE()
      };
      inputs.push(input);
    }
    return inputs;
  }

  parseTransparentOutputs(mParser: any): Array<TxOutput> {
    const count = mParser.readVarInt();
    // console.log('tx out count:', count);
    const outputs: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const valueSatoshis: number = mParser.readUInt64LE();
      const value: number = valueSatoshis / (10**8);
      const pkScript: string = mParser.raw(mParser.readVarInt()).toString('hex');
      const address: string = this.addressUtil.classifyAndEncodeAddress(pkScript);
      const output = {
        value,
        valueSatoshis,
        pkScript,
        address
      }
      outputs.push(output);
    }
    return outputs;
  }

  parseShieldedInputs(mParser: any): Array<ShieldedInputs> {
    const count = mParser.readVarInt();
    // console.log('shielded in count:', count);
    const inputs: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const input = {
        cv: mParser.raw(32).reverse().toString('hex'),
        anchor: mParser.raw(32).reverse().toString('hex'),
        nullifier: mParser.raw(32).reverse().toString('hex'),
        rk: mParser.raw(32).reverse().toString('hex'),
        zkProof: mParser.raw(192).toString('hex'),
        spendAuthSig: mParser.raw(64).reverse().toString('hex')
      }
      inputs.push(input);
    }
    return inputs;
  }

  parseShieldedOutputs(mParser: any): Array<ShieldedOutputs> {
    const count = mParser.readVarInt();
    // console.log('shielded out count:', count);
    const outputs: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const output = {
        cv: mParser.raw(32).reverse().toString('hex'),
        cmu: mParser.raw(32).reverse().toString('hex'),
        ephemeralKey: mParser.raw(32).reverse().toString('hex'),
        encCyphertext: mParser.raw(580).toString('hex'),
        outCyphertext: mParser.raw(80).toString('hex'),
        zkProof: mParser.raw(192).toString('hex')
      }
      outputs.push(output);
    }
    return outputs;
  }

  parseJoinSplits(mParser: any, count: number): string {
    // console.log('joinSplits count:', count);
    if (count > 0) {
      return mParser.raw(count * 1698).reverse().toString('hex')
    }
    return '';
  }
}
