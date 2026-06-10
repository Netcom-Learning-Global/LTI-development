import { createError } from "h3";
import Platform from "../../models/Platform";
import {connectDB} from "../../utils/db";
export default defineEventHandler(async (event) => {

  try {

    await connectDB();

    const id = event.context.params?.id;

    const platform = await Platform.findById(id)
      .select("toolName description clientEmail moodleUrl orgId orgName");

    if (!platform) {
      throw createError({
        statusCode: 404,
        statusMessage: "Platform not found",
      });
    }

    return {
      success: true,
      data: platform,
    };

  } catch (error: any) {

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage:
        error.statusMessage || "Internal Server Error",
    });
  }
});