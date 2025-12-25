import mongoose from "mongoose";

export interface IRoom extends Document {
  _id: string;
  room: string;
  capacity: number;
  layout: { row: number; benches: number }[];
  studentRoomType: string;
  clientOrganizationId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
  entry: string;
}

const RoomLayoutSchema = new mongoose.Schema({
  row: { type: Number, required: true },
  benches: { type: Number, required: true }
}, { _id: false });

const RoomSchema = new mongoose.Schema(
  {
    room: { type: String, required: true},
    capacity: { type: Number, required: true },
    studentRoomType: { type: String, required: true },
    layout: { type: [RoomLayoutSchema], required: true },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    entry: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Room =
  mongoose.models.rooms || mongoose.model("rooms", RoomSchema);

export default Room;
