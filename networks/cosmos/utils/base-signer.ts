import {
  Auth,
  HttpEndpoint,
  SignerConfig,
  BroadcastOptions,
  UniSigner,
  SignDocResponse,
  SignResponse,
  CreateDocResponse,
  StdFee,
} from "@uni-sign/types";
import {
  BaseSigner as _BaseSigner,
  assertEmpty,
  isEmpty,
} from "@uni-sign/utils";
import { defaultSignerConfig } from "../defaults";
import {
  EncodedMessage,
  Encoder,
  FeeOptions,
  Message,
  QueryClient,
  Secp256k1PubKey,
  SignMode,
  SignerOptions,
  TimeoutHeightOption,
  TxOptions,
  TxRaw,
} from "../types";
import { RpcClient } from "../query/rpc";
import {
  constructAuthInfo,
  constructSignerInfo,
  constructTxBody,
} from "./direct";
import { toFee } from "./amino";

export abstract class BaseSigner<
  SignDoc,
  SignOptions extends FeeOptions & SignerOptions & TxOptions
> extends _BaseSigner implements UniSigner<SignDoc, TxRaw> {
  protected _queryClient?: QueryClient;
  readonly encoders: Encoder[];

  constructor(
    auth: Auth,
    encoders: Encoder[],
    endpoint?: string | HttpEndpoint,
    config: SignerConfig = defaultSignerConfig
  ) {
    super(auth, config);
    if (!isEmpty(endpoint)) {
      this.setEndpoint(endpoint);
    }
    this.encoders = encoders;
  }

  addEncoders = (encoders: Encoder[]) => {
    this.encoders.push(...encoders);
  };

  getEncoder = (typeUrl: string) => {
    const encoder = this.encoders.find(
      (encoder) => encoder.typeUrl === typeUrl
    );
    if (!encoder) {
      throw new Error(
        `No such Encoder for typeUrl ${typeUrl}, please add corresponding Encoder with method \`addEncoder\``
      );
    }
    return encoder;
  };

  async getAddress() {
    return await this.queryClient.getAddress();
  }

  setEndpoint(endpoint: string | HttpEndpoint) {
    this._queryClient = new RpcClient(endpoint, this.publicKeyHash);
  }

  get queryClient() {
    assertEmpty(this._queryClient);
    return this._queryClient;
  }

  get encodedPublicKey(): EncodedMessage {
    switch (this.auth.algo) {
      case "secp256k1":
        return {
          typeUrl: Secp256k1PubKey.typeUrl,
          value: Secp256k1PubKey.encode(
            Secp256k1PubKey.fromPartial({ key: this.publicKey.value })
          ).finish(),
        };
      case "ed25519":
        throw new Error(
          "Ed25519 signer info construction is not implemented yet"
        );
      default:
        throw new Error(`Unsupported public key algorithm: ${this.auth.algo}`);
    }
  }

  /**
   * convert relative timeoutHeight to absolute timeoutHeight
   */
  protected async toAbsoluteTimeoutHeight(
    timeoutHeight?: TimeoutHeightOption
  ): Promise<{ type: "absolute"; value: bigint } | undefined> {
    return isEmpty(timeoutHeight)
      ? void 0
      : {
          type: "absolute",
          value:
            timeoutHeight.type === "absolute"
              ? timeoutHeight.value
              : (await this.queryClient.getLatestBlockHeight()) +
                timeoutHeight.value,
        };
  }

  /**
   * createTransaction without signing
   */
  async createTxRaw(
    messages: Message[],
    signMode: SignMode,
    fee?: StdFee,
    memo?: string,
    options?: SignOptions
  ) {
    const { txBody, encode } = constructTxBody(
      messages,
      this.getEncoder,
      memo,
      {
        ...options,
        timeoutHeight: await this.toAbsoluteTimeoutHeight(
          options?.timeoutHeight
        ),
      }
    );

    const { signerInfo } = constructSignerInfo(
      this.encodedPublicKey,
      options?.sequence ?? (await this.queryClient.getSequence()),
      signMode
    );

    const stdFee =
      fee ??
      (await this.queryClient.estimateFee(txBody, [signerInfo], options));

    const txRaw = TxRaw.fromPartial({
      bodyBytes: encode(),
      authInfoBytes: constructAuthInfo([signerInfo], toFee(stdFee)).encode(),
      signatures: [],
    });
    return { txRaw, fee: stdFee };
  }

  abstract signDoc: (doc: SignDoc) => Promise<SignDocResponse<SignDoc>>;
  abstract createDoc(
    messages: Message[],
    fee: StdFee,
    memo?: string,
    options?: SignOptions
  ): Promise<CreateDocResponse<SignDoc, TxRaw>>;

  async sign(
    messages: Message[],
    fee?: StdFee,
    memo?: string,
    options?: SignOptions
  ): Promise<SignResponse<SignDoc, TxRaw>> {
    const created = await this.createDoc(messages, fee, memo, options);
    const { signature, signDoc } = await this.signDoc(created.signDoc);
    const txRawCompleted = TxRaw.fromPartial({
      ...created.tx,
      signatures: [signature.value],
    });

    return {
      signature,
      signDoc,
      tx: txRawCompleted,
      broadcast: async (options?: BroadcastOptions) => {
        return this.broadcast(txRawCompleted, options);
      },
    };
  }

  async broadcast(txRaw: TxRaw, options?: BroadcastOptions) {
    return this.broadcastArbitrary(
      TxRaw.encode(TxRaw.fromPartial(txRaw)).finish(),
      options
    );
  }

  async broadcastArbitrary(message: Uint8Array, options?: BroadcastOptions) {
    const result = await this.queryClient.broadcast(message, options);
    return result;
  }

  async signAndBroadcast(
    messages: Message[],
    fee?: StdFee,
    memo?: string,
    options?: SignOptions & BroadcastOptions
  ) {
    const { broadcast } = await this.sign(messages, fee, memo, options);
    return await broadcast(options);
  }
}
