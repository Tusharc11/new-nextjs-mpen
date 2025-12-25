import mongoose from "mongoose";

export interface IClass extends mongoose.Document {
  _id: string;
  classNumber: number;
  clientOrganizationId: string[];
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const ClassSchema = new mongoose.Schema(
  {
    classNumber: { type: Number, required: true, unique: true },
    clientOrganizationId: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    }],
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Class =
  mongoose.models.classes || mongoose.model("classes", ClassSchema);

export default Class;
