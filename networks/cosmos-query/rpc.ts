import { HttpEndpoint } from "@uni-sign/types";
import { fromBase64, randomId, toHex, toHttpEndpoint } from "@uni-sign/utils";
import { QueryImpl } from "./service-ops";
import { TxRpc } from "./types";

function createTxRpc(endpoint: HttpEndpoint): TxRpc {
  return {
    request: async (
      service: string,
      method: string,
      data: Uint8Array
    ): Promise<Uint8Array> => {
      const req = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...endpoint.headers,
        },
        body: JSON.stringify({
          id: randomId(),
          jsonrpc: "2.0",
          method: "abci_query",
          params: {
            data: toHex(data),
            path: `/${service}/${method}`,
            prove: false,
          },
        }),
      };
      const resp = await fetch(endpoint.url, req);
      const json = await resp.json();
      if (json["error"] != void 0) {
        throw new Error(`Request Error: ${json["error"]}`);
      }
      try {
        const result = fromBase64(json["result"]["response"]["value"]);
        return result;
      } catch (error) {
        throw new Error(`Request Error: ${json["result"]["response"]["log"]}`);
      }
    },
  };
}

export class RpcQuery extends QueryImpl {
  constructor(endpoint: string | HttpEndpoint) {
    super();
    this.init(createTxRpc(toHttpEndpoint(endpoint)));
  }
}
