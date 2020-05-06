### Block encoding
Everything is little endian unless otherwise noted

#### Bitcoin
- version: (4 bytes) 32 bit uint
- prevBlockHash: (32 bytes) hex string
- hashMerkleRoot: (32 bytes) hex string
- timestamp: (4 bytes) 32 bit uint, linux epoch
- bits: (4 bytes) hex string
- nonce: (32 bytes) hex string
- txCount: (var int)
  * version: (4 bytes)
  * witness: (2 bytes) OPTIONAL. (always 0001 if present)
  * txInCount: (var int) transparent inputs
    * outpointHash: (32 bytes) hex string
    * outpointIndex: (4 bytes) 32 bit uint
    * scriptLength: (var int)
    * signatureScript: (bytes = scriptLength)
    * sequence: (4 bytes) 32 bit uint
  * txOutCount: (var int) transparent outputs
    * value: (8 bytes) 64 bit int
    * pkScriptLength (var int)
    * pkScript (bytes = pkScriptLength) public address
  * txWitnessCount: (var int) OPTIONAL
    * txWitnessLength: (var int)
    * txWitness: (bytes = txWitnessLength)
  * lockTime: (4 bytes) 32 bit uint


#### Zcash
- version: (4 bytes) 32 bit uint
- prevBlockHash: (32 bytes) hex string
- hashMerkleRoot: (32 bytes) hex string
- hashFinalSaplingRoot: (32 bytes) hex string
- timestamp: (4 bytes) 32 bit uint, linux epoch
- bits: (4 bytes) hex string
- nonce: (32 bytes) hex string
- solutionSize: (var int)
- solution: (bytes = solutionSize) hex string
- txCount: (var int)
  * header: (4 bytes)
  * nVersionGroupId: (4 bytes)
  * txInCount: (var int) transparent inputs
    * outpointHash: (32 bytes) hex string
    * outpointIndex: (4 bytes) 32 bit uint
    * scriptLength: (var int)
    * signatureScript: (bytes = scriptLength)
    * sequence: (4 bytes) 32 bit uint
  * txOutCount: (var int) transparent outputs
    * value: (8 bytes) 64 bit int
    * pkScriptLength (var int)
    * pkScript (bytes = pkScriptLength) public address
  * lockTime: (4 bytes) 32 bit uint
  * nExpiryHeight (4 bytes) 32 bit uint
  * saplingValueBalance: (8 bytes) 64 bit int. Spend transfers minus Output transfers.
  * nShieldedSpend: (var int) The number of Spend descriptions in vShieldedSpend.
  * vShieldedSpend: (384 bytes each * nShieldedSpend)
    * cv: (32 bytes) A value commitment to the value of the output note.
    * anchor: (32 bytes) A root of the Sapling note commitment tree at some block height in the past
    * nullifier (32 bytes) The nullifier of the input note
    * rk (32 bytes) The randomized public key for spendAuthSig
    * zkProof (192 bytes)
    * spendAuthSig (64)
  * nShieldedOutput (var int) The number of Output descriptions in vShieldedOutput
  * vShieldedOutput (984 bytes each * nShieldedOutput)
    * cv: (32 bytes) A value commitment to the value of the output note.
    * cmu (32 bytes) The u-coordinate of the note commitment for the output note.
    * ephemeralKey (32 bytes) An encoding of an ephemeral jubjub public key
    * encCyphertext (580 bytes) A ciphertext component for the encrypted output note.
    * outCyphertext (80 bytes) A ciphertext component for the encrypted output note.
    * zkProof (192 bytes)
  * nJoinSplit (var int)
  * vJoinSplit (1698 * nJoinSplit)
  * joinSplitPubKey (32 bytes)
  * joinSplitSig (64 bytes)
  * bindingSig (64 bytes)
