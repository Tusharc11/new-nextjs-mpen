import mongoose from "mongoose";

const organizationSchema = new mongoose.Schema(
  {
    organizationId: { type: Number, required: true, unique: true },
    organizationName: { type: String, required: true },
    organizationLogo: { type: String, required: false },
    organizationWebsite: { type: String, required: false },
    organizationDescription: { type: String, required: false },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Organizations = mongoose.models.organizations || mongoose.model("organizations", organizationSchema);

export default Organizations; 