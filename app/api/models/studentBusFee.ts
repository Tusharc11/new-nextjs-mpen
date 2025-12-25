import mongoose, { Schema, Document } from "mongoose";

export interface IStudentBusFee extends Document {
  studentId: string;
  studentBusId: string;
  routeDestination: string;
  amount: number;
  dueDate: Date; // Due date for this specific bus fee entry
  status: 'not_started' | 'pending' | 'overdue' | 'paid'; // Payment status
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const StudentBusFeeSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    studentBusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "studentBus",
      required: true,
    },
    routeDestination: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
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
StudentBusFeeSchema.index({ status: 1, dueDate: 1 });
StudentBusFeeSchema.index({ studentId: 1, studentBusId: 1 });

export const StudentBusFee =
  mongoose.models.studentBusFee || mongoose.model("studentBusFee", StudentBusFeeSchema);

export default StudentBusFee;
