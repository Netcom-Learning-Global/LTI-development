import Jwk from "rasha";
import { connectDB } from "../utils/db";
import Platform from "../models/Platform";

export default defineEventHandler(async () => {
  await connectDB();
  const platforms = await Platform.find();
  const keys = [];

  for (const record of platforms) {
    const data = record.data;
    if (!data?.publicKey || !data?.kid) continue;
    const jwk = await Jwk.import({
      pem: data.publicKey,
      public: true,
    });
    keys.push({
      ...jwk,
      kid: data.kid,
      alg: "RS256",
      use: "sig",
    });
  }
  return { keys };
});