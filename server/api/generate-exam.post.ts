import axios from "axios";
import { getAccessToken } from "../api/auth";
import { connectDB } from "../utils/db";
import logger from "../utils/logger";
import { randomUUID } from "crypto";
import Launch from "../models/Launch";

export default defineEventHandler(async (event) => {
  const requestId = randomUUID();
  try {
    const body = await readBody(event);
    const { resourceId, ltiToken } = body;
    logger.info({
      requestId,
      msg: "Generate exam API called",
      resourceId,
    });
    // ✅ Guards
    if (!ltiToken) {
      throw new Error("LTI token missing");
    }
    if (!resourceId || isNaN(Number(resourceId))) {
      throw new Error("Invalid resourceId");
    }
    const config = useRuntimeConfig();
    // ✅ Get access token for exam API
    const accessToken = await getAccessToken();
    logger.info({
      requestId,
      accessToken,
      msg: "Access token fetched",
    });
    // ✅ Decode LTI token
    let decoded: any = {};
    try {
      decoded = JSON.parse(
        Buffer.from(ltiToken.split(".")[1], "base64").toString()
      );
    } catch (err) {
      logger.error({
        requestId,
        msg: "Token decode failed",
        error: err,
      });
      throw new Error("Invalid LTI token");
    }
    // ✅ Extract user info
    const email =
      decoded.email ||
      decoded["https://purl.imsglobal.org/spec/lti/claim/ext"]?.user_email ||
      decoded["https://purl.imsglobal.org/spec/lti/claim/custom"]?.email ||
      `${decoded.sub || "user"}@dummy.com`;

    const name =
      decoded.name ||
      (decoded.given_name || decoded.family_name
        ? `${decoded.given_name || ""} ${decoded.family_name || ""}`.trim()
        : decoded[
            "https://purl.imsglobal.org/spec/lti/claim/ext"
          ]?.user_username) ||
      "LTI User";

    // ✅ Extract LTI context (VERY IMPORTANT 🔥)
    const clientId = decoded.clientId;
    const platformUrl = decoded.platformUrl;
    const deploymentId =decoded.deploymentId;
    const userId = decoded.userId;
    //console.log("decodedUser",decoded);
    const attemptId = `${resourceId}_${userId}_${Date.now()}`;
    // ✅ Prepare payload for exam API
    logger.info({
      requestId,
      msg: "Attempt created",
      attemptId,
      userId,
      examId: resourceId,
    });
    const payload = {
      exam_id: Number(resourceId),
      email,
      name,
      password:
        "$2b$10$B2re5z9b7GvwNSRWUxXodeNVy83VfQsiq92ZTLy/xrY2V7SXOMGEm",
      additional_info: {
        attemptId,
      },
    };

    // ✅ Call external exam API
    const res = await axios.post(
      `${process.env.LTI_SSO_EXAM_GENERATE}/sync/generateexamlink`,
      payload,
      {
        headers: {
          "req-access-token": String(accessToken),
          "org-api-key": String(process.env.ORG_API_KEY),
        },
        timeout: 15000
      }
    );
    const examRes = res.data;
    if (examRes.error) {
      logger.error({
        msg: "Exam API returned error",
        response: examRes,
      });
      throw new Error("Exam API failed");
    }
    const token = examRes.data.accessToken;
    const examId = examRes.data.exam_id;
    logger.info({
      requestId,
      msg: "Exam generated successfully",
      examId,
    });
    // 🔥 SAVE LTI CONTEXT FOR WEBHOOK
    await connectDB();
    const agsEndpoint = decoded["https://purl.imsglobal.org/spec/lti-ags/claim/endpoint"];
    const lineitem = agsEndpoint?.lineitem || decoded.lineitem;
if (!lineitem) {
  logger.warn({
    requestId,
    msg: "Lineitem missing in decoded token",
    data:JSON.stringify(decoded, null, 2)
  });
}
    await Launch.findOneAndUpdate(
      {
        userId,
        examId
      },
      {
        attemptId:token,
        email
      }
    );
    logger.info({
      requestId,
      msg: "Launch mapping saved",
      attemptId:token,
    });
    const redirectUrl = `${process.env.STUDENT_URL}?examId=${examId}&userId=${token}&attemptId=${attemptId}`;
    return { redirectUrl };
  } catch (err: any) {
    logger.error({
      msg: "Generate Exam Error",
      error: err.message,
      stack: err.stack,
    });
    throw createError({
      statusCode: 500,
      statusMessage: err.message || "Exam generation failed",
    });
  }
});