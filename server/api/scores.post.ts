import { ZodError, z } from "zod";
import { jwtVerify, getAccessToken } from "../utils/auth";
import { connectDB } from "../utils/db";
import Platform from "../models/Platform";
import Launch from "../models/Launch";
import logger from "../utils/logger";
import { randomUUID } from "crypto";

const createScoreBodySchema = z.object({
  score: z.number(),
  resourceId: z.number(),
});

export default defineEventHandler(async (event) => {
  const requestId = randomUUID();
  const body = await readBody(event);
  const { jwtSecret } = useRuntimeConfig();
  let inputScore: number;
  // ✅ Validate body
  try {
    const parsed = await createScoreBodySchema.parseAsync(body);
    inputScore = parsed.score;
    logger.info({
      requestId,
      msg: "Score API called",
      score: inputScore,
      resourceId: parsed.resourceId,
    });
  } catch {
    logger.warn({
      requestId,
      msg: "Invalid request body",
      body,
    });
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid request body",
    });
  }
  // ✅ AUTH
  const authHeader = getHeader(event, "Authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    logger.warn({
      requestId,
      msg: "Missing token",
    });
    throw createError({ statusCode: 401, statusMessage: "Missing token" });
  }
  let toolToken: any;
  try {
    toolToken = await jwtVerify(token, jwtSecret);
    logger.info({
      requestId,
      msg: "Token verified",
      userId: toolToken.sub,
    });
  } catch {
    throw createError({ statusCode: 401, statusMessage: "Invalid token" });
  }
  const { iss, aud, sub } = toolToken;

  const platformUrl =
    iss === "http://localhost:9000"
      ? "http://localhost:8080"
      : iss;

  await connectDB();

  // ✅ GET PLATFORM
  const record = await Platform.findOne({
    iss: platformUrl,
    clientId: aud,
  });

  const platform = record?.data;

  if (!platform) {
    logger.error({
      requestId,
      msg: "Platform not found",
      platformUrl,
      clientId: aud,
    });
    throw createError({
      statusCode: 404,
      statusMessage: "Platform not found",
    });
  }

  // ✅ GET ACCESS TOKEN (ONLY score scope)
  const { accessToken, tokenType } = await getAccessToken(platform, [
    "https://imsglobal.org",
    "https://purl.imsglobal.org/spec/lti-ags/scope/score",
  ]);

  const launch = await Launch.findOne({
    userId: sub,
    examId: body.resourceId,
  });

  if (!launch || typeof launch.lineitem !== "string") {
    logger.error({
      requestId,
      msg: "Launch mapping missing",
      userId: sub,
      examId: body.resourceId,
    });
    throw createError({
      statusCode: 404,
      statusMessage: "Lineitem mapping missing",
    });
  }

  const rawLineitem = launch.lineitem;
  const baseLineitem = rawLineitem.includes("?")
    ? rawLineitem.split("?")[0]
    : rawLineitem.replace(/\/$/, "");

  const scoreUrl = `${baseLineitem}/scores`;
  logger.info({
    msg: "Score URL prepared",
    scoreUrl,
  });
  const payload = {
    userId: String(sub),
    scoreGiven: inputScore, // send directly (0–100)
    scoreMaximum: 100,
    activityProgress: "Completed",
    gradingProgress: "FullyGraded",
    timestamp: new Date().toISOString(),
  };

  try {
    await $fetch(scoreUrl, {
      method: "POST",
      headers: {
        Authorization: `${tokenType} ${accessToken}`,
        "Content-Type": "application/vnd.ims.lis.v1.score+json",
        "Accept": "application/json",
      },
      body: payload,
    });

    logger.info({
      msg: "Score successfully sent",
    });


    return { success: true };

  } catch (err: any) {
    logger.error({
      msg: "Moodle AGS error",
      error: err.data || err.message,
      scoreUrl,
    });

    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: `Moodle Error: ${
        err.data?.message || "Score submission failed"
      }`,
    });
  }
});