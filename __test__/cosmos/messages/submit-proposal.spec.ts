import { DirectSigner } from "@uni-sign/cosmos/direct";
import { MsgSubmitProposal } from "@uni-sign/cosmos-msgs/cosmos/gov/v1beta1/tx";
import { TextProposal } from "@uni-sign/cosmos-msgs/cosmos/gov/v1beta1/gov";

import { address, chain } from "../../data";
import { toConverter, toEncoder } from "@uni-sign/cosmos/utils";
import { Message } from "@uni-sign/cosmos/types";
import { AminoSigner } from "@uni-sign/cosmos/amino";
import { auth } from "../constants";

export const messages: Message<MsgSubmitProposal>[] = [
  {
    typeUrl: MsgSubmitProposal.typeUrl,
    value: {
      proposer: address.cosmoshub.genesis,
      initialDeposit: [
        {
          amount: "1000000",
          denom: chain.cosmoshub.denom,
        },
      ],
      content: {
        typeUrl: "/cosmos.gov.v1beta1.TextProposal",
        value: TextProposal.encode(
          TextProposal.fromPartial({
            title: "Test Proposal",
            description: "Test text proposal for the @sign testing",
          })
        ).finish(),
      },
    },
  },
];

describe("Submit proposal", () => {
  it("should success with direct signing", async () => {
    const signer = new DirectSigner(
      auth,
      [toEncoder(MsgSubmitProposal)],
      chain.cosmoshub.rpc
    );
    const resp = await (await signer.sign(messages)).broadcast({
      checkTx: true,
      deliverTx: true,
    });
    expect(resp.check_tx?.code).toEqual(0);
    expect(resp.deliver_tx?.code).toEqual(0);
  });

  it("should success with amino signing", async () => {
    const signer = new AminoSigner(
      auth,
      [toEncoder(MsgSubmitProposal)],
      [toConverter(MsgSubmitProposal)],
      chain.cosmoshub.rpc
    );
    const resp = await (await signer.sign(messages)).broadcast({
      checkTx: true,
      deliverTx: true,
    });
    expect(resp.check_tx?.code).toEqual(0);
    expect(resp.deliver_tx?.code).toEqual(0);
  });
});
