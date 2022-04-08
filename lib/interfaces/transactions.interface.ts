export type BitcoinTransaction = {
  txid: string;
  version: number;
  vin: Array<TxInput>;
  vout: Array<TxOutput>;
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
  txid: string;
  vout: number;
  scriptSig: {
    hex: string;
  };
  txinwitness?: string[];
  sequence: number;
}

export type TxOutput = {
  value: number;
  n: number;
  scriptPubKey: {
    hex: string;
    address: string;
  }
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
