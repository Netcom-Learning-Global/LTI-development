import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// ✅ Interface
export interface IResult {
  examId: number;
  userId?: string;
  email?: string;
  name?: string;
  score: number;
  status: "PENDING" | "SENT";
}

// ✅ Schema with typing
const ResultSchema = new Schema<IResult>(
  {
    examId: { type: Number, required: true },
    userId: String,
    email: String,
    name: String,
    score: Number,
    status: {
      type: String,
      enum: ["PENDING", "SENT"],
      default: "PENDING",
    },
  },
  { timestamps: true }
);

// ✅ THIS LINE IS KEY
const Result =
  (models.Result as mongoose.Model<IResult>) ||
  model<IResult>("Result", ResultSchema);

export default Result;