import { ZodError, z } from "zod";
import {
  NonceAlreadyUsedError,
  PlatformNotFoundError,
  createToolLtiToken,
  validatePlatformToken,
} from "../utils/auth";
import jwt from "jsonwebtoken";
import useIDTokenStorage, { getIDTokenStorageKey } from "../storage/idToken";

import { getState } from "../storage/state"; // you will create this

const deepLinkLaunchBodySchema = z.object({
  id_token: z.string(),
  state: z.string(),
});

export default defineEventHandler(async (event) => {
  const { serverUrl } = useRuntimeConfig();
  const body = await readBody(event);

  let idToken, state;

  //  Parse body
  try {
    ({ id_token: idToken, state } =
      await deepLinkLaunchBodySchema.parseAsync(body));
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

  // Validate LTI token
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
  const stateData = await getState(state);

  if (!stateData) {
    throw createError({
      statusCode: 401,
      statusMessage: "State not found",
    });
  }

  if (stateData.issuer !== tokenPayload.iss) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid state issuer",
    });
  }

  if (Date.now() - stateData.createdAt > 5 * 60 * 1000) {
    throw createError({
      statusCode: 401,
      statusMessage: "State expired",
    });
  }
  await stateData.delete();
  const idTokenStorage = useIDTokenStorage();

  const idTokenStorageKey = getIDTokenStorageKey({
    issuer: tokenPayload.iss,
    clientId: tokenPayload.aud,
    deploymentId:
      tokenPayload["https://purl.imsglobal.org/spec/lti/claim/deployment_id"],
    userId: tokenPayload.sub,
  });

  await idTokenStorage.setItem(idTokenStorageKey, tokenPayload);
  const ltiToken = createToolLtiToken(tokenPayload);
  const url = new URL("deep-link-select", serverUrl);
  url.searchParams.append("lti", ltiToken);
  url.searchParams.append(
    "iss",
    tokenPayload.iss
  );
  return sendRedirect(event, url.href);
});