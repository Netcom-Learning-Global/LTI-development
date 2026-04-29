import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export interface ILaunch {
  examId: number;
  clientId: string;
  platformUrl: string;
  deploymentId: string;
  userId: string;
  email: string;
  attemptId: string; // ✅ FIXED
  lineitem: string
}

const LaunchSchema = new Schema<ILaunch>({
  examId: Number,
  clientId: String,
  platformUrl: String,
  deploymentId: String,
  userId: String,
  email: String,
  // 🔥 IMPROVED
  attemptId: {
    type: String,
    required: true,
    unique: true,
  },
  lineitem: String
});

const Launch =
  (models.Launch as mongoose.Model<ILaunch>) ||
  model<ILaunch>("Launch", LaunchSchema);
export default Launch;