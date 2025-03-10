import { assertEmpty, fromUtf8 } from "@uni-sign/utils";
import { AminoMessage, AminoConverter, Message } from "../types";
import { Coin } from "../codegen/cosmos/base/v1beta1/coin";
import { Fee } from "../codegen/cosmos/tx/v1beta1/tx";
import { TelescopeGeneratedType } from "../codegen/types";
import { StdFee, StdSignDoc } from "@uni-sign/types";

function sortKey<T>(target: T): T {
  if (target === null || typeof target !== "object") {
    return target;
  }
  if (Array.isArray(target)) {
    return target.map(sortKey) as T;
  }
  const sortedObj: Record<string, any> = {};
  Object.keys(target)
    .sort()
    .forEach((key) => {
      sortedObj[key] = sortKey((target as Record<string, any>)[key]);
    });
  return sortedObj as T;
}

export function encodeStdSignDoc(doc: StdSignDoc) {
  const sorted = sortKey(doc);
  const str = JSON.stringify(sorted);
  const serialized = str
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e");
  return fromUtf8(serialized);
}

export function toMessages(
  aminoMsgs: AminoMessage[],
  getConverter: (aminoType: string) => AminoConverter
): Message[] {
  return aminoMsgs.map(({ type, value }) => {
    const { fromAmino, typeUrl } = getConverter(type);
    return {
      typeUrl,
      value: fromAmino(value),
    };
  });
}

export function toAminoMsgs(
  messages: Message[],
  getConverter: (typeUrl: string) => AminoConverter
): AminoMessage[] {
  return messages.map(({ typeUrl, value }) => {
    const { toAmino, aminoType } = getConverter(typeUrl);
    return {
      type: aminoType,
      value: toAmino(value),
    };
  });
}

export function toFee(fee: StdFee): Fee {
  return Fee.fromPartial({
    amount: fee.amount.map((coin) => Coin.fromPartial(coin)),
    gasLimit: BigInt(fee.gas),
    payer: fee.payer,
    granter: fee.granter,
  });
}

export function toStdFee(fee: Fee): StdFee {
  return {
    amount: fee.amount,
    gas: fee.gasLimit.toString(),
    granter: fee.granter === "" ? void 0 : fee.granter,
    payer: fee.payer === "" ? void 0 : fee.payer,
  };
}

export function toConverter(
  generated: TelescopeGeneratedType<any, any, any>
): AminoConverter {
  assertEmpty(generated.aminoType);
  return {
    aminoType: generated.aminoType,
    typeUrl: generated.typeUrl,
    fromAmino: (data: any) => {
      assertEmpty(generated.fromAmino);
      return generated.fromAmino(data);
    },
    toAmino: (data: any) => {
      assertEmpty(generated.toAmino);
      return generated.toAmino(data);
    },
  };
}
