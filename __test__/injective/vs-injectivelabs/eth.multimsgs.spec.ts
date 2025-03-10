import { address, chain } from "../../data";
import {
  MsgSend,
  getEip712TypedData,
  getEip712TypedDataV2,
  MsgVote,
} from "@injectivelabs/sdk-ts";
import { EthereumChainId } from "@injectivelabs/ts-types";
import { MsgSend as _MsgSend } from "@uni-sign/cosmos-msgs/cosmos/bank/v1beta1/tx";
import { VoteOption } from "@uni-sign/cosmos-msgs/cosmos/gov/v1/gov";
import { Message, StdFee } from "@uni-sign/cosmos/types";
import { Eip712Signer } from "@uni-sign/injective/eip712";
import { auth } from "../constants";
import { toConverter, toEncoder } from "@uni-sign/cosmos/utils";

const msg = MsgSend.fromJSON({
  amount: {
    denom: chain.injective.prefix,
    amount: "0.01",
  },
  srcInjectiveAddress: address.injective.genesis,
  dstInjectiveAddress: address.injective.test1,
});

const msg2 = MsgVote.fromJSON({
  proposalId: 11,
  voter: address.injective.genesis,
  vote: VoteOption.VOTE_OPTION_YES,
  metadata: "",
});

const messages: Message<_MsgSend>[] = [
  {
    typeUrl: _MsgSend.typeUrl,
    value: {
      amount: [
        {
          amount: "0.01",
          denom: chain.injective.denom,
        },
      ],
      fromAddress: address.injective.genesis,
      toAddress: address.injective.test1,
    },
  },
];

const signer = new Eip712Signer(
  auth,
  [toEncoder(_MsgSend)],
  [toConverter(_MsgSend)],
  chain.injective.rpc
);

const fee: StdFee = {
  gas: "2000",
  amount: [
    {
      denom: chain.injective.denom,
      amount: "0.05",
    },
  ],
  payer: address.injective.genesis,
};

describe("Compare with @injectivelabs", () => {
  it("Eip712SignDoc should match", async () => {
    const eip712TypedData = getEip712TypedDataV2({
      msgs: [msg, msg2],
      tx: {
        accountNumber: "5",
        sequence: "3",
        timeoutHeight: "10",
        chainId: "injective-1",
      },
      fee: {
        amount: [
          {
            denom: chain.injective.denom,
            amount: "0.05",
          },
        ],
        gas: "2000",
        feePayer: address.injective.genesis,
      },
      ethereumChainId: EthereumChainId.Mainnet,
    });

    console.log(
      "%c__test__/injective/vs-injectivelabs/eth.multimsgs.spec.ts:84 eip712TypedData",
      "color: #007acc;",
      JSON.stringify(eip712TypedData, undefined, 4)
    );

    const { signDoc } = await signer.createDoc(messages, fee, "", {
      sequence: 3n,
      accountNumber: 5n,
      chainId: chain.injective.chainId,
      timeoutHeight: {
        type: "absolute",
        value: 10n,
      },
      ethereumChainId: EthereumChainId.Mainnet,
    });

    expect(signDoc).toEqual(eip712TypedData);
  });
});
