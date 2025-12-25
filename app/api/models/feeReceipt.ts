import mongoose, { Schema, Document } from "mongoose";

export interface IFeeReceipt extends Document {
  studentId: string;
  clientOrgId: string;
  studentPaymentIds: string[];
  totalAmount: number;
  issuedOn: Date;
  addedDate: Date;
  modifiedDate: Date;
}

const FeeReceiptSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    clientOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    studentPaymentIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "studentFeePayment",
      required: true,
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    issuedOn: { type: Date, required: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const FeeReceipt =
  mongoose.models.feeReceipt || mongoose.model("feeReceipt", FeeReceiptSchema);

export default FeeReceipt; 