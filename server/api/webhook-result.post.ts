import { connectDB } from "../utils/db";
import Launch from "../models/Launch";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";
import { randomUUID } from "crypto";
export default defineEventHandler(async (event) => {
  const requestId = randomUUID();
  try {
    const body = await readBody(event);
    logger.info({
      requestId,
      msg: "Webhook received",
      body,
    });
    const { exam_id, percentage, additional_info } = body;
    if (!additional_info?.attemptId) {
      logger.warn({
        requestId,
        msg: "Missing attemptId",
        body,
      });
      throw createError({
        statusCode: 400,
        statusMessage: "attemptId missing",
      });
    }
    const attemptId = additional_info.attemptId;
    const score = Number(percentage || 0);
    await connectDB();
    // ✅ Find mapping
    const launch = await Launch.findOne({ attemptId } as any);
    if (!launch) {
      logger.error({
        requestId,
        msg: "Mapping not found",
        attemptId,
      });
      throw createError({
        statusCode: 404,
        statusMessage: "Mapping not found",
      });
    }
    logger.info({
      requestId,
      msg: "Mapping found",
      userId: launch.userId,
      examId: launch.examId,
    });
    const { jwtSecret } = useRuntimeConfig();
    const ltiToken = jwt.sign(
      {
        iss: launch.platformUrl === "http://localhost:9000"
          ? "http://localhost:8080"   // ✅ fix platform URL
          : launch.platformUrl,
        aud: launch.clientId,         // ✅ clientId
        sub: launch.userId,           // ✅ userId
        "https://purl.imsglobal.org/spec/lti/claim/deployment_id":
          launch.deploymentId,
      },
      jwtSecret,
      { expiresIn: "5m" }
    );
    logger.info({
      requestId,
      msg: "LTI token generated",
      userId: launch.userId,
    });
    logger.info({
      requestId,
      msg: "Calling /api/scores",
      score,
      examId: launch.examId,
    });
    await $fetch("/api/scores", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ltiToken}`,
      },
      body: {
        score,
        resourceId: launch.examId,
      },
    });
    logger.info({
      requestId,
      msg: "✅ Score updated in Moodle",
      attemptId,
    });
    return {
      success: true,
      message: "Score updated",
    };

  } catch (err: any) {
    logger.error({
      requestId,
      msg: "Webhook Error",
      error: err.message,
      data: err.data,
      stack: err.stack,
    });
    throw createError({
      statusCode: err.statusCode || 500,
      statusMessage: err.message || "Webhook failed",
    });
  }
});