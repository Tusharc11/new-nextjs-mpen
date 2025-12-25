import mongoose from "mongoose";

export interface IExamType extends Document {
  _id: string;
  type: string;
  clientOrganizationId: string;
  defaultBenchCapacity: number;
  isBenchCapacityCapture: boolean;
  isActive: boolean;
  addedDate: Date;
}

const ExamTypeSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    defaultBenchCapacity: { type: Number, default: 1 }, // if this is available then isbenchcapacitycapture is false else true, will be used for auto seating
    isBenchCapacityCapture: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
  }
);

export const ExamType =
  mongoose.models.examTypes || mongoose.model("examTypes", ExamTypeSchema, "examTypes");

export default ExamType;
