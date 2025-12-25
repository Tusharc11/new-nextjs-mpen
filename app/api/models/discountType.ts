import mongoose, { Schema, Document } from "mongoose";

export interface IDiscountType extends Document {
  _id: string;
  type: string;
  value: number;
  clientOrgId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
  academicYearId: string;
}

const DiscountTypeSchema = new mongoose.Schema(
  {
    type: { 
      type: String, 
      required: true
    },
    value: { type: Number, required: true, min: 0 },
    clientOrgId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "academicyears",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const DiscountType =
  mongoose.models.discountType || mongoose.model("discountType", DiscountTypeSchema);

export default DiscountType; 