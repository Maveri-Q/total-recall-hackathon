// Read-only check that we can reach Sui Mainnet through Tatum's gRPC gateway. No wallet needed.
// Run: npx tsx scripts/check-sui.mts
import { existsSync } from "node:fs";
import { ChannelCredentials } from "@grpc/grpc-js";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const client = new SuiGrpcClient({
  network: "mainnet",
  transport: new GrpcTransport({
    host: "sui-mainnet-grpc.gateway.tatum.io:443",
    channelCredentials: ChannelCredentials.createSsl(),
    meta: { "x-api-key": process.env.TATUM_API_KEY!.trim() },
  }),
});

const core = client.core as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
console.log("core methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(client.core)).filter((n) => n !== "constructor").join(", "));

for (const name of ["getChainIdentifier", "getReferenceGasPrice"]) {
  try {
    console.log(name, JSON.stringify(await core[name].call(client.core, {}), (_k, v) => (typeof v === "bigint" ? v.toString() : v)));
  } catch (e) {
    console.log(name, "failed:", e instanceof Error ? e.message : e);
  }
}
