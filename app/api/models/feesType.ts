import mongoose, { Schema, Document } from "mongoose";

export interface IFeesType extends Document {
  _id: string;
  name: string; // e.g. "Tuition Fee", "Library Fee", "Sports Fee" etc.
  isActive: boolean;
  clientOrganizationId: string;
  addedDate: Date;
  modifiedDate: Date;
}

const FeesTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const FeesType =
  mongoose.models.feesType || mongoose.model("feesType", FeesTypeSchema);

export default FeesType; 