export declare type BitcoinTransaction = {
    txid: string;
    version: string;
    txIn: Array<TxInput>;
    txOut: Array<TxOutput>;
    witnesses?: any;
    lockTime: number;
    nExpiryHeight: number;
};
export declare type ZcashTransaction = {
    saplingValueBalance: number;
    shieldedInputs: Array<ShieldedInputs>;
    shieldedOutputs: Array<ShieldedOutputs>;
    joinSplits: string;
    joinSplitPubKey: string;
    joinSplitSig: string;
    bindingSig: string;
} & BitcoinTransaction;
export declare type TxInput = {
    outpointIndex: number;
    txid: string;
    signatureScript: string;
    sequence: string;
};
export declare type TxOutput = {
    value: number;
    pkScript: string;
};
export declare type ShieldedInputs = {
    cv: string;
    anchor: string;
    nullifier: string;
    rk: string;
    zkProof: string;
    spendAuthSig: string;
};
export declare type ShieldedOutputs = {
    cv: string;
    cmu: string;
    ephemeralKey: string;
    encCyphertext: string;
    outCyphertext: string;
    zkProof: string;
};
