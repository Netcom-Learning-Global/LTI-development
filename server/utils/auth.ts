import { randomBytes, generateKeyPairSync } from "node:crypto";
import jwt, { GetPublicKeyOrSecret, Secret, VerifyOptions } from "jsonwebtoken";
import jwksRsa from "jwks-rsa";

import { connectDB } from "../utils/db";
import PlatformModel from "../models/Platform";

import useNonceStorage from "../storage/nonce";
import { IDTokenPayload } from "../types/idToken";
import { Platform } from "../types/platform";

// ✅ FIXED: return keys instead of storing in memory
export async function generatePlatformKeyPair() {
  const kid = randomBytes(16).toString("hex");

  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: "spki",
      format: "pem",
    },
    privateKeyEncoding: {
      type: "pkcs8",
      format: "pem",
    },
  });

  return { kid, publicKey, privateKey };
}

export class PlatformNotFoundError extends Error {
  constructor() {
    super("Platform not found.");
  }
}

export class NonceAlreadyUsedError extends Error {
  constructor() {
    super("Nonce already used.");
  }
}

export class PlatformPrivateKeyNotFoundError extends Error {
  constructor() {
    super("Platform private key not found.");
  }
}

// ✅ Validate LTI Token
export async function validatePlatformToken(
  idToken: string
): Promise<IDTokenPayload> {
  const decodedIdToken = jwt.decode(idToken, { complete: true });
  const payload = decodedIdToken?.payload as IDTokenPayload;

  const { aud, iss, nonce } = payload;

  await connectDB();

  const record = await PlatformModel.findOne({
    iss,
    clientId: aud,
  });

  const platform = record?.data;

  if (!platform) throw new PlatformNotFoundError();

  const { authConfig, clientId } = platform;

  // ✅ Verify using JWKS
  await jwtVerify(
    idToken,
    (header, callback) => {
      const client = jwksRsa({ jwksUri: authConfig.key });
      client.getSigningKey(header.kid, (err, key) => {
        if (err) return callback(err);
        callback(null, key?.getPublicKey());
      });
    },
    {
      algorithms: ["RS256"],
      audience: clientId,
    }
  );

  // ✅ Nonce validation
  const nonceStorage = useNonceStorage();

  if (await nonceStorage.hasItem(nonce)) {
    throw new NonceAlreadyUsedError();
  }

  await nonceStorage.setItem(nonce, true);

  return payload;
}

// ✅ Create tool token
export function createToolLtiToken(idTokenPaylod: IDTokenPayload): string {
  const { jwtSecret, serverUrl } = useRuntimeConfig();

  return jwt.sign(
    {
      userId: idTokenPaylod.sub,
      clientId: idTokenPaylod.aud,
      platformUrl: idTokenPaylod.iss,
      deploymentId:
        idTokenPaylod[
          "https://purl.imsglobal.org/spec/lti/claim/deployment_id"
        ],
      email: idTokenPaylod.email,
      name: idTokenPaylod.name,
    },
    jwtSecret,
    {
      issuer: serverUrl,
      expiresIn: "1h",
    }
  );
}

// ✅ FIXED: use DB privateKey instead of storage
export async function getAccessToken(
  platform: Platform,
  scopes: string[]
): Promise<{ tokenType: string; accessToken: string }> {
  const platformPrivateKey = platform.privateKey;

  if (!platformPrivateKey) {
    throw new PlatformPrivateKeyNotFoundError();
  }

  const now = Math.floor(Date.now() / 1000);

  const token = jwt.sign(
    {
      sub: platform.clientId,
      iss: platform.clientId,
      aud: platform.accessTokenEndpoint,
      iat: now,
      exp: now + 60, // 🔥 MUST BE SHORT
      jti: Math.random().toString(36),
    },
    platformPrivateKey,
    {
      algorithm: "RS256",
      keyid: platform.kid,
    }
  );

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_assertion_type:
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    client_assertion: token,
    scope: scopes.join(" "),
  });

  const response = await fetch(platform.accessTokenEndpoint, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  const data = await response.json();

  // 🔥 CRITICAL DEBUG
  console.log("🔥 TOKEN RESPONSE DATA:", data);

  if (!response.ok) {
    throw new Error(`Token API failed: ${JSON.stringify(data)}`);
  }

  if (!data.access_token) {
    throw new Error(`No access_token returned: ${JSON.stringify(data)}`);
  }

  return {
    tokenType: data.token_type,
    accessToken: data.access_token,
  };
}

// ✅ helper
export function jwtVerify(
  token: string,
  secretOrPublicKey: Secret | GetPublicKeyOrSecret,
  options?: VerifyOptions
) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, options, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}