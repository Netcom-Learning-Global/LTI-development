import axios from "axios";
import { getAccessToken } from "~/server/api/auth"; // ✅ correct path
import { connectDB } from "../utils/db";
import Result from "../models/Result";
import logger from "../utils/logger";
import { randomUUID } from "crypto";
export default defineEventHandler(async (event) => {
  const requestId = randomUUID();
    try {
      const body = await readBody(event);
      const { examId, ltiToken } = body;
      logger.info({
        requestId,
        msg: "Webhook received",
        examId,
      });
  
      if (!examId || !ltiToken) {
        logger.warn({
          requestId,
          msg: "Missing examId or ltiToken",
          body,
        });
  
        throw new Error("Missing examId or ltiToken");
      }
      const examRes = await axios.get(
        `${process.env.EXAM_API}/result/${examId}`
      );
      const { score, email, name } = examRes.data;
      logger.info({
        requestId,
        msg: "Fetched result from exam API",
        score,
        email,
      });
      await connectDB();
      const existing = await Result.findOne({examId});
  
      if (existing && existing.status === "SENT") {
        logger.info({
          requestId,
          msg: "Score already submitted",
          examId,
        });
        return { message: "Score already submitted" };
      }
      const result =
        existing ||
        (await Result.create({
          examId,
          score,
          email,
          name,
          status: "PENDING",
        }));
        logger.info({
          requestId,
          msg: "Result saved in DB",
          status: result.status,
        });
        logger.info({
          requestId,
          msg: "Sending score to internal /api/score",
        });
      await $fetch("/api/score", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ltiToken}`,
        },
        body: {
          score,
          resourceId: examId,
        },
      });
      result.status = "SENT";
      await result.save();
      return {
        success: true,
        score,
      };
  
    } catch (err: any) {
      logger.error({
        requestId,
        msg: "Submit Result Error",
        error: err.response?.data || err.message,
        stack: err.stack,
      });
      throw createError({
        statusCode: 500,
        statusMessage: err.message,
      });
    }
  });