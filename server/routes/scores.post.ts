import { ZodError, z } from "zod";
import { jwtVerify, getAccessToken } from "../utils/auth";
import jwt from "jsonwebtoken";

import { ToolLtiTokenPayload } from "../types/toolLtiToken";
import useIDTokenStorage, {
  getIDTokenStorageKey,
} from "../storage/idToken";

import { connectDB } from "../utils/db";
import Platform from "../models/Platform";

const createScoreBodySchema = z.object({
  score: z.number(),
  resourceId: z.number(),
});

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { jwtSecret } = useRuntimeConfig();

  let score;

  // ✅ Validate body
  try {
    ({ score } = await createScoreBodySchema.parseAsync(body));
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

  // ✅ AUTH HEADER
  const Authorization = getHeader(event, "Authorization");
  const schema = Authorization?.split(" ")[0];
  const token = Authorization?.split(" ")[1];

  if (schema !== "Bearer" || !token) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid token",
    });
  }

  // ✅ VERIFY TOKEN
  let toolToken: ToolLtiTokenPayload;

  try {
    toolToken = (await jwtVerify(token, jwtSecret)) as ToolLtiTokenPayload;
  } catch (error) {
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
      statusMessage: "Token verification failed",
    });
  }

  const { clientId, platformUrl, deploymentId, userId } = toolToken;
  // ✅ CONNECT DB
  await connectDB();

  // ✅ FETCH PLATFORM
  const record = await Platform.findOne({
    iss: platformUrl,
    clientId,
  });

  const platform = record?.data;
  if (!platform) {
    throw createError({
      statusCode: 404,
      statusMessage: "Platform not found",
    });
  }

  // ✅ GET ID TOKEN
  const idTokenStorage = useIDTokenStorage();

  const idToken = await idTokenStorage.getItem(
    getIDTokenStorageKey({
      issuer: platformUrl,
      clientId,
      deploymentId,
      userId,
    })
  );

  if (!idToken) {
    throw createError({
      statusCode: 404,
      statusMessage: "ID token not found",
    });
  }

  // ✅ GET ACCESS TOKEN (AGS)
  const { accessToken, tokenType } = await getAccessToken(platform, [
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/score",
  ]);

  // ✅ SCORE PAYLOAD
  const payload = {
    userId,
    scoreGiven: score,
    scoreMaximum: 100,
    activityProgress: "Completed",
    gradingProgress: "FullyGraded",
    timestamp: new Date().toISOString(),
  };

  const rawLineitem =
    idToken[
      "https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"
    ]?.lineitem;

  if (!rawLineitem) {
    throw createError({
      statusCode: 400,
      statusMessage: "Lineitem endpoint missing",
    });
  }

 // 🔥 ALWAYS strip query params safely
const baseLineitem = rawLineitem.split("?")[0];

// ✅ FINAL URL
const scoreUrl = `${baseLineitem}/scores`;
  await $fetch(scoreUrl, {
    method: "POST",
    headers: {
      Authorization: `${tokenType} ${accessToken}`,
      "Content-Type": "application/vnd.ims.lis.v1.score+json",
    },
    body: payload,
  });

  logger.info("Score successfully sent to Moodle", { scoreUrl });

  return {
    success: true,
  };
});