import { readBody, createError } from "h3";
import Platform from "../../models/Platform";
import {connectDB} from "../../utils/db";

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
    const alreadyExists = await Platform.findOne({
      moodleUrl,
    });

    if (alreadyExists) {
      throw createError({
        statusCode: 400,
        statusMessage: "Moodle URL already connected",
      });
    }

    const platform = await Platform.create({
      toolName,
      description,
      clientEmail,
      moodleUrl,
    });

    return {
      success: true,
      message: "Thanks for connecting your moodle with our platform. Please check email related to your shared account  ",
      data: platform,
    };
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message,
    });
  }
});