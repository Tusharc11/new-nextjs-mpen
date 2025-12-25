import mongoose from "mongoose";

export interface ILeave extends Document {
  staffId: string;
  approverId: string;
  leaveFromDate: string;
  leaveToDate: string;
  reason: string;
  status: string;
  clientOrganizationId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const LeaveSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    approverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    leaveFromDate: { type: Date, required: true },
    leaveToDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: "Pending" },
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

export const Leave =
  mongoose.models.leaves || mongoose.model("leaves", LeaveSchema);

export default Leave;
