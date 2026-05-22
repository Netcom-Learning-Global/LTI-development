import { readBody, createError } from "h3";
import Platform from "../../models/Platform";
import {connectDB} from "../../utils/db";

export default defineEventHandler(async (event) => {
  await connectDB();

  const id = event.context.params?.id;

  const body = await readBody(event);

  const updatedPlatform =
    await Platform.findByIdAndUpdate(
      id,
      {
        toolName: body.toolName,
        description: body.description,
      },
      {
        new: true,
      }
    ).select(
      "toolName description moodleUrl"
    );

  if (!updatedPlatform) {
    throw createError({
      statusCode: 404,
      statusMessage: "Platform not found",
    });
  }

  return {
    success: true,
    message: "Platform updated successfully",
    data: updatedPlatform,
  };
});