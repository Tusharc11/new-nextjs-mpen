import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    role_name: String,
  },
  {
    timestamps: true,
  }
);

const Role = mongoose.models.Roles || mongoose.model("Roles", RoleSchema);

export default Role;
