import { MessageParser } from '../util/Message'

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
    const mParser: MessageParser = new MessageParser(payload);
    const raw: Buffer = Buffer.allocUnsafe(36);
    payload.copy(raw);
    const versionBytes = mParser.raw(4)
    if (!versionBytes) {
      throw new Error('parseTransactionInv versionBytes undefined')
    }
    const version = parseInt(versionBytes.reverse().toString('hex'), 16);
    const hashBytes = mParser.raw(32)
    if (!hashBytes) {
      throw new Error('parseTransactionInv hashBytes undefined')
    }
    const hash = hashBytes.reverse().toString('hex');
    const txInv = {
      version,
      hash,
      raw
    }
    return txInv
  }

  parseTransactions(payload: Buffer, count: number = 0, blockTime: number): Array<BitcoinTransaction | ZcashTransaction> {
    const mParser = new MessageParser(payload);
    if (count === 0) {
      count = mParser.readVarInt() || 0;
    }
    switch (this.options.network.protocol) {
      case 'bitcoin':
        return this.parseBitcoinTransactions(mParser, count, blockTime);
      case 'zcash':
        return this.parseZcashTransactions(mParser, count);
    }
    return [];
  }

  parseBitcoinTransactions(mParser: MessageParser, count: number, blockTime: number): Array<BitcoinTransaction> {
    const txes: Array<BitcoinTransaction> = [];
    for (let i = 0; i < count; i ++) {
      const bytesStart = mParser.pointerPosition();
      const version = mParser.readUInt32LE() || 0;
      // const versionBytesEnd = mParser.pointerPosition();
      const witnessFlagBytes = mParser.raw(2) || Buffer.from([])
      const witnessFlag = witnessFlagBytes.toString('hex');
      const witness = (
        witnessFlag === '0001' &&
        blockTime >= SEGWIT_ACTIVATION_EPOCH
      ) ? true : false;
      if (!witness) {
        mParser.incrPointer(-2);
      }
      const inputs = this.parseTransparentInputs(mParser);
      const vout = this.parseTransparentOutputs(mParser);
      const witnesses = this.parseWitnesses(mParser, witness, inputs.length);
      const lockTime = mParser.readUInt32LE() || 0;
      const vin = (witness && inputs.length > 0 && witnesses.length > 0)
        ? inputs.map((v, j) => ((witnesses[j].length > 0) ? {
          ...v, txinwitness: witnesses[j]
        }: v)) : inputs
      
      const bytesEnd = mParser.pointerPosition();
      const rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
      if (!rawBytes) {
        throw new Error('parseBitcoinTransactions rawBytes undefined')
      }
      const txid = this.util.sha256d(rawBytes).reverse().toString('hex');

      const tx = {
        txid,
        version,
        vin,
        vout,
        lockTime
      }
      console.log(JSON.stringify(tx))
      txes.push(tx);
    }
    return txes;
  }

  parseZcashTransactions(mParser: MessageParser, count: number): Array<ZcashTransaction> {
    const txes: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const bytesStart = mParser.pointerPosition();
      const headerBytes = mParser.raw(4)
      if (!headerBytes) {
        throw new Error('parseZcashTransactions headerBytes undefined')
      }
      const header = headerBytes.reverse().toString('hex');
      const nVersionGroupIdBytes = mParser.raw(4)
      if (!nVersionGroupIdBytes) {
        throw new Error('parseZcashTransactions nVersionGroupIdBytes undefined')
      }
      const nVersionGroupId = nVersionGroupIdBytes.reverse().toString('hex');
      const txIn = this.parseTransparentInputs(mParser);
      const txOut = this.parseTransparentOutputs(mParser);
      const lockTime = mParser.readUInt32LE();
      const nExpiryHeight = mParser.readUInt32LE();
      const saplingValueBalance = mParser.readUInt64LE();
      const shieldedInputs = this.parseShieldedInputs(mParser);
      const shieldedOutputs = this.parseShieldedOutputs(mParser);
      const nJoinSplits = mParser.readVarInt();
      if (nJoinSplits == null) {
        throw new Error('parseZcashTransactions nJoinSplits undefined')
      }
      const joinSplits = this.parseJoinSplits(mParser, nJoinSplits);
      const joinSplitPubKey = (nJoinSplits > 0) ?
        (mParser.raw(32) || []).reverse().toString('hex') : '';
      const joinSplitSig = (nJoinSplits > 0) ?
        (mParser.raw(64) || []).reverse().toString('hex') : '';
      const bindingSig = (shieldedInputs.length + shieldedOutputs.length > 0) ?
        (mParser.raw(64) || []).reverse().toString('hex') : '';

      const bytesEnd = mParser.pointerPosition();
      const rawBytes = mParser.rawSegment(bytesStart, bytesEnd);
      if (!rawBytes) {
        throw new Error('parseZcashTransactions rawBytes undefined')
      }
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

  parseWitnesses(mParser: MessageParser, witnessFlag: boolean, count: number): Array<Array<string>> {
    const wits: Array<Array<string>> = [];
    if (witnessFlag) {
      for (let i = 0; i < count; i++) {
        const w: Array<string> = [];
        const witnessCount = mParser.readVarInt() || 0;
        for (let i = 0; i < witnessCount; i++) {
          const scriptLength = mParser.readVarInt() || 0;
          const witness = (mParser.raw(scriptLength) || []).toString('hex');
          w.push(witness);
        }
        wits.push(w)
      }
    }
    return wits;
  }

  parseTransparentInputs(mParser: MessageParser): Array<TxInput> {
    const count = mParser.readVarInt() || 0;
    const inputs: Array<TxInput> = [];
    for (let i = 0; i < count; i++) {
      const txidBytes = mParser.raw(32) || Buffer.from([])
      const txid = txidBytes.reverse().toString('hex')
      const vout = mParser.readUInt32LE()
      if (vout == null) {
        throw new Error('parseTransparentInputs outpoint index undefined')
      }
      const sigScriptLength = mParser.readVarInt() || 0
      const sigScriptBytes = mParser.raw(sigScriptLength) || Buffer.from([])
      const hex = sigScriptBytes.reverse().toString('hex')
      const sequence = mParser.readUInt32LE() || 0
      const input = {
        txid,
        vout,
        scriptSig: {
          hex
        },
        sequence
      };
      inputs.push(input);
    }
    return inputs;
  }

  parseTransparentOutputs(mParser: MessageParser): Array<TxOutput> {
    const count = mParser.readVarInt() || 0;
    // console.log('tx out count:', count);
    const outputs: Array<TxOutput> = [];
    for (let i = 0; i < count; i++) {
      const valueSatoshis: number = mParser.readUInt64LE() || 0;
      const value: number = valueSatoshis / (10**8);
      const pkScriptBytes = mParser.raw(mParser.readVarInt() || 0)
      const hex = (pkScriptBytes) ? pkScriptBytes.toString('hex') : '';
      const address = this.addressUtil.classifyAndEncodeAddress(hex);
      const output = {
        value,
        n: i,
        scriptPubKey: {
          hex,
          address
        }
      }
      outputs.push(output);
    }
    return outputs;
  }

  parseShieldedInputs(mParser: MessageParser): Array<ShieldedInputs> {
    const count = mParser.readVarInt() || 0;
    // console.log('shielded in count:', count);
    const inputs: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const cvBytes = mParser.raw(32) || Buffer.from([])
      const anchorBytes = mParser.raw(32) || Buffer.from([])
      const nullifierBytes = mParser.raw(32) || Buffer.from([])
      const rkBytes = mParser.raw(32) || Buffer.from([])
      const zkProofBytes = mParser.raw(192) || Buffer.from([])
      const spendAuthSigBytes = mParser.raw(64) || Buffer.from([])
      const input = {
        cv: cvBytes.reverse().toString('hex'),
        anchor: anchorBytes.reverse().toString('hex'),
        nullifier: nullifierBytes.reverse().toString('hex'),
        rk: rkBytes.reverse().toString('hex'),
        zkProof: zkProofBytes.toString('hex'),
        spendAuthSig: spendAuthSigBytes.reverse().toString('hex')
      }
      inputs.push(input);
    }
    return inputs;
  }

  parseShieldedOutputs(mParser: MessageParser): Array<ShieldedOutputs> {
    const count = mParser.readVarInt() || 0;
    // console.log('shielded out count:', count);
    const outputs: Array<any> = [];
    for (let i = 0; i < count; i++) {
      const cvBytes = mParser.raw(32) || Buffer.from([])
      const cmuBytes = mParser.raw(32) || Buffer.from([])
      const ephemeralKeyBytes = mParser.raw(32) || Buffer.from([])
      const encCyphertextBytes = mParser.raw(580) || Buffer.from([])
      const outCyphertextBytes = mParser.raw(80) || Buffer.from([])
      const zkProofBytes = mParser.raw(192) || Buffer.from([])
      const output = {
        cv: cvBytes.reverse().toString('hex'),
        cmu: cmuBytes.reverse().toString('hex'),
        ephemeralKey: ephemeralKeyBytes.reverse().toString('hex'),
        encCyphertext: encCyphertextBytes.toString('hex'),
        outCyphertext: outCyphertextBytes.toString('hex'),
        zkProof: zkProofBytes.toString('hex')
      }
      outputs.push(output);
    }
    return outputs;
  }

  parseJoinSplits(mParser: MessageParser, count: number): string {
    // console.log('joinSplits count:', count);
    if (count > 0) {
      const joinSplitBytes = mParser.raw(count * 1698) || Buffer.from([])
      return joinSplitBytes.reverse().toString('hex')
    }
    return '';
  }
}
