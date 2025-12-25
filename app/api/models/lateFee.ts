import mongoose, { Schema, Document } from "mongoose";

export interface ILateFee extends Document {
  _id: string;
  classId: string[];
  academicYearId: string;
  amount: number;
  clientOrganizationId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date; 
}

const LateFeeSchema = new mongoose.Schema(
  {
    classId: [{ 
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: true
    }],
    academicYearId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: "academicyears",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const LateFee =
  mongoose.models.lateFee || mongoose.model("lateFee", LateFeeSchema);

export default LateFee; 