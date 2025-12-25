import mongoose, { Schema, Document } from "mongoose";

export interface IStudentFee extends Document {
  studentId: string;
  feesStructureId: string;
  discountTypeId?: string;
  dueDate: Date; // Due date for this specific fee entry
  status: 'not_started' | 'pending' | 'overdue' | 'paid'; // Payment status
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const StudentFeeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    feesStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "feesStructure",
      required: true,
    },
    discountTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "discountType",
      required: false,
    },
    dueDate: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      required: true,
      enum: ['not_started', 'pending', 'overdue', 'paid'],
      default: 'not_started'
    },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Add index for efficient status queries
StudentFeeSchema.index({ status: 1, dueDate: 1 });
StudentFeeSchema.index({ studentId: 1, feesStructureId: 1 });

export const StudentFee =
  mongoose.models.studentFee || mongoose.model("studentFee", StudentFeeSchema);

export default StudentFee; 