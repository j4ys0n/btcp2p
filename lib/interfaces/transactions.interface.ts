export type BitcoinTransaction = {
  txid: string;
  version: string;
  txIn: Array<TxInput>;
  txOut: Array<TxOutput>;
  witnesses?: any;
  lockTime: number;
}

export type ZcashTransaction = {
  nExpiryHeight: number;
  saplingValueBalance: number;
  shieldedInputs: Array<ShieldedInputs>;
  shieldedOutputs: Array<ShieldedOutputs>;
  joinSplits: string;
  joinSplitPubKey: string;
  joinSplitSig: string;
  bindingSig: string;
} & BitcoinTransaction

export type TxInput = {
  outpointIndex: number;
  txid: string;
  signatureScript: string;
  sequence: string;
}

export type TxOutput = {
  value: number;
  pkScript: string;
}

export type ShieldedInputs = {
  cv: string;
  anchor: string;
  nullifier: string;
  rk: string;
  zkProof: string;
  spendAuthSig: string;
}

export type ShieldedOutputs = {
  cv: string;
  cmu: string;
  ephemeralKey: string;
  encCyphertext: string;
  outCyphertext: string;
  zkProof: string;
}
