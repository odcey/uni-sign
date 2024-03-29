import { AminoSigner } from "@uni-sign/cosmos/amino";
import { toConverter, toEncoder } from "@uni-sign/cosmos/utils";
import { StargateMsgs } from "@uni-sign/cosmos-msgs/stargate";
import { TxImpl } from "@uni-sign/cosmos-msgs/stargate.tx";
import { HttpEndpoint } from "@uni-sign/types";

import { SigningClient } from "./signing-client";
import { SignerOptions } from "./types/signing-client";
import { OfflineSigner } from "./types/wallet";
import { defaultAuth } from "./utils";

export class StargateSigningClient extends SigningClient {
  readonly helpers: TxImpl;

  constructor(
    aminoSigner: AminoSigner,
    offlineSigner: OfflineSigner,
    options: SignerOptions = {}
  ) {
    super(aminoSigner, offlineSigner, options);
    this.aminoSigner.addEncoders(StargateMsgs.map((g) => toEncoder(g)));
    this.aminoSigner.addConverters(StargateMsgs.map((g) => toConverter(g)));
    this.helpers = new TxImpl();
    this.helpers.init(this.txRpc);
  }

  static connectWithSigner(
    endpoint: string | HttpEndpoint,
    signer: OfflineSigner,
    options: SignerOptions = {}
  ): StargateSigningClient {
    const aminoSigner = new AminoSigner(defaultAuth, [], [], endpoint);
    const signingClient = new StargateSigningClient(
      aminoSigner,
      signer,
      options
    );
    signingClient.setEndpoint(endpoint);
    return signingClient;
  }
}
