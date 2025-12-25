import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema(
  {
    clientId: { type: Number, required: true, unique: true },
    clientName: { type: String, required: true },
    clientLogo: { type: String, required: true },
    clientWebsite: { type: String, required: false },
    clientDescription: { type: String, required: false },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Clients = mongoose.models.clients || mongoose.model("clients", ClientSchema);

export default Clients; 