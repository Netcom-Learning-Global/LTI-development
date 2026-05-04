import { ZodError, z } from "zod";
import {
  NonceAlreadyUsedError,
  PlatformNotFoundError,
  createToolLtiToken,
  validatePlatformToken,
} from "../utils/auth";
import { getStateCookieName } from "../utils/cookie";
import jwt from "jsonwebtoken";
import useIDTokenStorage, {
  getIDTokenStorageKey,
} from "../storage/idToken";

// 🔥 NEW IMPORTS
import { connectDB } from "../utils/db";
import Launch from "../models/Launch";

const launchBodySchema = z.object({
  id_token: z.string(),
  state: z.string(),
});

export default defineEventHandler(async (event) => {
  const { serverUrl } = useRuntimeConfig();
  const body = await readBody(event);

  let idToken, state;

  // ✅ Parse body
  try {
    ({ id_token: idToken, state } =
      await launchBodySchema.parseAsync(body));
  } catch (error: any) {
    if (error instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Something went wrong",
    });
  }

  let tokenPayload;

  // ✅ Validate LTI token
  try {
    tokenPayload = await validatePlatformToken(idToken);
  } catch (error) {
    if (error instanceof PlatformNotFoundError) {
      throw createError({
        statusCode: 404,
        statusMessage: error.message,
      });
    }
    if (error instanceof NonceAlreadyUsedError) {
      throw createError({
        statusCode: 401,
        statusMessage: error.message,
      });
    }
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError
    ) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid token",
      });
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Something went wrong",
    });
  }

  // ✅ Validate state
  const cookieName = getStateCookieName(state);
  const issuer = getCookie(event, cookieName);
  deleteCookie(event, cookieName);

  if (!issuer || tokenPayload.iss !== issuer) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid state",
    });
  }

  // ✅ Extract resourceId (your custom mapping)
  const resourceId =
    tokenPayload["https://purl.imsglobal.org/spec/lti/claim/custom"]
      ?.resource_id;

  if (!resourceId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Resource ID not found",
    });
  }

  // ✅ Store ID Token (keep this)
  const idTokenStorage = useIDTokenStorage();

  const idTokenStorageKey = getIDTokenStorageKey({
    issuer: tokenPayload.iss,
    clientId: tokenPayload.aud,
    deploymentId:
      tokenPayload["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
    userId: tokenPayload.sub,
  });

  await idTokenStorage.setItem(idTokenStorageKey, tokenPayload);

  // 🔥 ===== MAIN FIX START =====

  const lineitem =
    tokenPayload[
      "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"
    ]?.lineitem;
  await connectDB();
  await Launch.findOneAndUpdate(
    {
      userId: tokenPayload.sub,
      examId: Number(resourceId),
    },
    {
      clientId: tokenPayload.aud,
      platformUrl: tokenPayload.iss,
      deploymentId:
        tokenPayload[
          "https://purl.imsglobal.org/spec/lti/claim/deployment_id"
        ],
      userId: tokenPayload.sub,
      examId: Number(resourceId),
      lineitem, // 🔥 CRITICAL
    },
    { upsert: true }
  );
  // ✅ Continue flow
  const ltiToken = createToolLtiToken(tokenPayload);
  const url = new URL(`resources/${resourceId}`, serverUrl);
  url.searchParams.append("lti", ltiToken);
  return sendRedirect(event, url.href);
});