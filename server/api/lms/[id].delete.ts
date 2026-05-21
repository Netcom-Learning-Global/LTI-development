import { createError } from "h3";
import Platform from "../../models/Platform";
import {connectDB} from "../../utils/db";

export default defineEventHandler(async (event) => {
  await connectDB();

  const id = event.context.params?.id;

  const deletedPlatform =
    await Platform.findByIdAndDelete(id);

  if (!deletedPlatform) {
    throw createError({
      statusCode: 404,
      statusMessage: "Platform not found",
    });
  }

  return {
    success: true,
    message: "Platform deleted successfully",
  };
});