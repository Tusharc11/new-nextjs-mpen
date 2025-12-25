import mongoose, { Schema, Document } from "mongoose";

export interface IStudentBusFeePayment extends Document {
  studentBusFeeId: string;
  amount: number;
  paidOn: Date;
  mode: string; // UPI, Cash, Cheque, Bank Transfer, Card
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const StudentBusFeePaymentSchema = new mongoose.Schema(
  {
    studentBusFeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "studentBusFee",
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

export const StudentBusFeePayment =
  mongoose.models.studentBusFeePayment || mongoose.model("studentBusFeePayment", StudentBusFeePaymentSchema);

export default StudentBusFeePayment;
