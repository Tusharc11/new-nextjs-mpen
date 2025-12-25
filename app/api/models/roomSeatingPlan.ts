import mongoose from "mongoose";

export interface IRoomSeatingPlan extends Document {
    roomId: string;
    seatingArrangementId: string[];
    examDate: Date;
    seatingPlan: {
        row: number;
        bench: number;
        position: string;
        rollNumber: number;
        classNumber: string;
        section: string;
    }[];
    benchCapacity: number;
    isActive: boolean;
    addedDate: Date;
    modifiedDate: Date;
}

const RoomSeatingPlanSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "rooms",
      required: true,
    },
    seatingArrangementId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "seatingArrangements",
        required: true,
      },
    ],
    examDate: { type: Date, required: true },
    seatingPlan: [
      {
        row: { type: Number, required: true },
        bench: { type: Number, required: true },
        position: { type: String, required: true },
        rollNumber: { type: Number, required: true },
        classNumber: { type: String, required: true },
        section: { type: String, required: true },
      },
    ],
    benchCapacity: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const RoomSeatingPlan =
  mongoose.models.roomSeatingPlans || mongoose.model("roomSeatingPlans", RoomSeatingPlanSchema);

export default RoomSeatingPlan;
