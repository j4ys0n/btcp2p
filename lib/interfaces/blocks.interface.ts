import { BitcoinTransaction, ZcashTransaction } from './transactions.interface';

export type BlockHeader = {
  hash: string;
  height?: number;
  version: number;
  prevBlock: string;
  nextBlock?: string;
  hashMerkleRoot: string;
  timestamp: number;
  bits: string;
  nonce: string;
  difficulty: number;
}

export type BlockHeaderZcash = {
  hashFinalSaplingRoot: string;
  solution: string;
} & BlockHeader

export interface BlockInv {
  raw: Buffer;
  parsed: {
    version: number;
    hash: string;
  }
}

export interface BlockList {
  [key: string]: {
    requested?: boolean;
    invReceived?: boolean;
    blockReceived: boolean;
    prevBlock?: string;
    nextBlock?: string;
    height?: number;
    data?: Block | BlockZcash;
  }
}

export interface ReducedBlockHeader {
  hash: string;
  height: number;
  prevBlock: string;
  nextBlock: string;
}

export interface InFlight {
  [key: string]: boolean;
}

export type Block = {
  transactions: Array<BitcoinTransaction>
} & BlockHeader

export type BlockZcash = {
  transactions: Array<ZcashTransaction>
} & BlockHeaderZcash

export interface BestBlock {
  height: number;
  hash: string;
}
