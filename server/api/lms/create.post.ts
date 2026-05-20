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

    // prevent duplicate Moodle URL
    //console.log("Incoming moodleUrl:", moodleUrl);
    const alreadyExists = await Platform.findOne({
      moodleUrl,
    });
    //console.log("alreadyExists:", alreadyExists);
    if (alreadyExists) {
      throw createError({
        statusCode: 400,
        statusMessage: "Moodle URL already connected",
      });
    }

    const platform = await Platform.create({
      iss: moodleUrl,
      clientId: `moodle_${Date.now()}`,
      toolName,
      description,
      clientEmail,
      moodleUrl,
    });
     // communication service payload
     const emailPayload = {
      email: clientEmail,
      name: toolName,
      moodleUrl,
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
    //console.error("CREATE LMS ERROR:", error);

  throw createError({
    statusCode:error.statusCode || 500,
    statusMessage:
      error.statusMessage ||
      error.message ||
      "Internal Server Error",
  });
  }
});