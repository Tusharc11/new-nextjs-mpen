import mongoose from "mongoose";

// Check if the model is already registered to avoid duplicate registration
const clientOrganizationSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clients",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "organizations",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

const ClientOrganization = 
  mongoose.models.clientorganizations || 
  mongoose.model("clientorganizations", clientOrganizationSchema);

export default ClientOrganization;
