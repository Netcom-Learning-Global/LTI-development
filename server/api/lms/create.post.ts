import { readBody, createError } from "h3";
import Platform from "../../models/Platform";
import {connectDB} from "../../utils/db";
import axios from "axios";
export default defineEventHandler(async (event) => {
  try {
    await connectDB();
    const body = await readBody(event);
    const {
      toolName,
      description,
      clientEmail,
      moodleUrl,
      orgId,
    } = body;
    if (
      !toolName ||
      !description ||
      !clientEmail ||
      !moodleUrl
    ) {
      throw createError({
        statusCode: 400,
        statusMessage: "All fields are required",
      });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const websiteRegex =/^https:\/\/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\/?$/;
    const normalizedMoodleUrl = moodleUrl.trim().replace(/\/$/, "");
    if (!emailRegex.test(clientEmail)) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid email address",
      });
    }

    if (!websiteRegex.test(normalizedMoodleUrl)) {
      throw createError({
        statusCode: 400,
        statusMessage:
          "Invalid Moodle URL. Use format: https://google.com",
      });
    }
    if (!orgId || isNaN(Number(orgId))) {
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid Organization ID",
      });
    }
    const alreadyExists = await Platform.findOne({
       moodleUrl:normalizedMoodleUrl,
    });
    if (alreadyExists) {
      throw createError({
        statusCode: 400,
        statusMessage: "Moodle URL already connected",
      });
    }
    let orgApiRes;
    try {
      orgApiRes = await axios.post(
        `${process.env.AUTH_URL}/auth/getapikeys`,
        {
          org_id: Number(orgId),
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err: any) {
      const messageCode = err?.response?.data?.message_code;
      let userMessage =
        err?.response?.data?.message ||
        err?.message ||
        "Internal Server Error";
      if (messageCode === "API_KEYS_NOT_FOUND") {
        userMessage =
          "No API keys were found for the selected Organization ID. Please generate API keys for this organization and try again.";
      }
      throw createError({
        statusCode:
          err?.response?.status ||
          err?.statusCode ||
          500,
        statusMessage: userMessage,
        data: err?.response?.data,
      });
    }
    
    const orgData = orgApiRes?.data?.data || {};
    if (!orgData?.org_id || !orgData?.api_key || !orgData?.secret_key) {
      throw createError({
        statusCode: 404,
        statusMessage: "Organization API keys not found",
      });
    }
    
    const platform = await Platform.create({
      iss: normalizedMoodleUrl,
      clientId: `moodle_${Date.now()}`,
      toolName,
      description,
      clientEmail,
      moodleUrl: normalizedMoodleUrl,
      orgId: orgData.org_id,
      apiKey: orgData.api_key,
      secretKey: orgData.secret_key,
    });
     const emailPayload = {
      email: clientEmail,
      name: toolName,
      moodleUrl: normalizedMoodleUrl,
      registrationUrl:
        `${process.env.NUXT_SERVER_URL}/registration`,
    };
    try {
      await axios.post(
        `${process.env.COMMUNICATION_SERVICE_URL}/sendlmsintegration`,
        emailPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err: any) {
      console.error({
        msg: "EMAIL SEND FAILED",
        error: err.message,
        response: err.response?.data,
      });
    }
    return {
      success: true,
      message: "Moodle connected successfully. Please check your email for LMS integration steps.",
      data: platform,
    };
  } catch (error: any) {
  throw createError({
      statusCode:
        error?.statusCode ||
        error?.response?.status ||
        500,

      statusMessage:
        error?.statusMessage ||
        error?.response?.data?.message_code ||
        error?.message ||
        "Internal Server Error",
    });
  }
});