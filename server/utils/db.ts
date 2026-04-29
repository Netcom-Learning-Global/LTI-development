import mongoose from "mongoose";
let isConnected = false;
export const connectDB = async () => {
  if (isConnected) return;
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI as string);
    isConnected = true;
    console.log("✅ MongoDB Connected:", conn.connection.host);
  } catch (error) {
    console.error("❌ DB Connection Error:", error);
    throw error;
  }
};