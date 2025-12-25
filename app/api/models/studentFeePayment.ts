import mongoose, { Schema, Document } from "mongoose";

export interface IStudentFeePayment extends Document {
  studentFeeId: string;
  feesStructureId: string;
  amount: number;
  paidOn: Date;
  mode: string; // UPI, Cash, Cheque
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const StudentFeePaymentSchema = new mongoose.Schema(
  {
    studentFeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "studentFee",
      required: true,
    },
    feesStructureId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "feesStructure",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paidOn: { type: Date, required: true },
    mode: { 
      type: String, 
      required: true,
      enum: ['UPI', 'Cash', 'Cheque', 'Bank Transfer', 'Card']
    },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const StudentFeePayment =
  mongoose.models.studentFeePayment || mongoose.model("studentFeePayment", StudentFeePaymentSchema);

export default StudentFeePayment; 