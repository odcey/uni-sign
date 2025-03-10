import { SignerConfig, Signature } from "@uni-sign/types";
import { Key, toHex } from "@uni-sign/utils";
import { computeAddress } from "@ethersproject/transactions";
import { bytes as assertBytes } from "@noble/hashes/_assert";
import { keccak_256 } from "@noble/hashes/sha3";

export const defaultSignerConfig: SignerConfig = {
  publicKey: {
    isCompressed: false,
    hash: (publicKey: Key) => Key.fromHex(computeAddress(publicKey.value)),
  },
  message: {
    hash: (message: Uint8Array) => {
      const hashed = keccak_256(message);
      assertBytes(hashed);
      return hashed;
    },
  },
  signature: {
    toCompact: (signature: Signature, algo: string) => {
      return signature.r
        .concat(signature.s)
        .concat(Key.fromHex(signature.recovery === 1 ? "1c" : "1b"));
    },
    fromCompact: (key: Key, algo: string) => {
      return {
        r: key.slice(0, 32),
        s: key.slice(32, 64),
        recovery: toHex(key.value.slice(64)) === "1c" ? 1 : void 0,
      };
    },
  },
};
