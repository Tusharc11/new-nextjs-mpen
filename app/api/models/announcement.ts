import mongoose from "mongoose";
import { IUser } from "./user";

export interface IAnnouncement extends Document {
  _id: string;
  content: string;
  senderId: IUser;
  messageType: string;
  groupType: string;
  clientOrganizationId: string;
  isFailed: boolean;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const AnnouncementSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    messageType: {
      type: String,
      required: true,
    },
    groupType: {
      type: String,
      required: true,
    },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientOrganizations",
      required: true,
    },
    isFailed: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Announcement =
  mongoose.models.announcement ||
  mongoose.model("announcement", AnnouncementSchema, "announcement");

export default Announcement;
