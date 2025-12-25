import mongoose, { Schema, Document } from "mongoose";

export interface IStudentLateFee extends Document {
  studentId: string;
  studentFeeId: string;
  lateFeeAmount: number;
  appliedOn: Date;
  reason?: string;
  isWaived: boolean;
  waivedAmount: number;
  waivedOn?: Date;
  waivedBy?: string;
  addedDate: Date;
  modifiedDate: Date;
}

const StudentLateFeeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    studentFeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "studentFee",
      required: true,
    },
    lateFeeAmount: { type: Number, required: true, min: 0 },
    appliedOn: { type: Date, required: true },
    reason: { type: String, required: false },
    isWaived: { type: Boolean, default: false },
    waivedAmount: { type: Number, required: false, min: 0 },
    waivedOn: { type: Date, required: false },
    waivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: false,
    },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const StudentLateFee =
  mongoose.models.studentLateFee || mongoose.model("studentLateFee", StudentLateFeeSchema);

export default StudentLateFee; 