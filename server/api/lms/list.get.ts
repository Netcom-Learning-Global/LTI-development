import Platform from "../../models/Platform";
import {connectDB} from "../../utils/db";

export default defineEventHandler(async () => {
  await connectDB();

  const platforms = await Platform.find().sort({
    createdAt: -1,
  });

  return {
    success: true,
    data: platforms,
  };
});