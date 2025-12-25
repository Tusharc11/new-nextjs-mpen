import mongoose, { Schema, Document } from "mongoose";

interface IFeesTypeAmount {
  feesTypeId: string;
  amount: number;
}

export interface IFeesStructure extends Document {
  _id: string;
  classId: string;
  sectionId: string[];
  clientOrganizationId: string;
  academicYearId: string;
  installment: string; // 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
  feesTypes: IFeesTypeAmount[];
  totalAmount: number;
  dueDates: Date[]; // Array of due dates based on installment
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const FeesStructureSchema = new mongoose.Schema(
  {
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: true,
    },
    sectionId: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "sections",
      required: true,
    }],
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sessions",
      required: true,
    },
    installment: { 
      type: String, 
      required: true,
      enum: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    },
    feesTypes: [{
      feesTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "feesType",
        required: true,
      },
      amount: { 
        type: Number, 
        required: true, 
        min: 0 
      }
    }],
    totalAmount: { type: Number, required: true, min: 0 },
    dueDates: [{ 
      type: Date, 
      required: true 
    }],
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const FeesStructure =
  mongoose.models.feesStructure || mongoose.model("feesStructure", FeesStructureSchema);

export default FeesStructure; 