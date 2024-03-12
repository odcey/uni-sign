import { StargateSigningClient } from "@cosmonauts/cosmjs/stargate";
import { messages } from "../../cosmos/messages/send-tokens.spec";

import { address, chain } from "../../data";
import { aminoClient, directClient, wallet } from "../constants";

describe("Cosmjs: Send tokens", () => {
  it("should success with direct signing", async () => {
    const resp = await directClient.helpers.send(
      address.osmosis.genesis,
      messages[0].value,
      "auto",
      ""
    );
    expect(resp.code).toEqual(0);
  });

  it("should success with amino signing", async () => {
    const resp = await aminoClient.helpers.send(
      address.osmosis.genesis,
      messages[0].value,
      "auto",
      ""
    );
    expect(resp.code).toEqual(0);
  });
});
