import mongoose from "mongoose";

export interface ISeatingArrangement extends Document {
    _id: string;
    examId: string;
    sectionId: {
      _id: string;
      section: string;
    };
    venueDetails: {
      roomId: string;
      startRollNo: Number;
      endRollNo: Number;
      rollNumbers: Number[];
    }
    isActive: boolean;
    addedDate: Date;
    modifiedDate: Date;
}

const SeatingArrangementSchema = new mongoose.Schema(
  {
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "exams",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sections",
      required: true,
    },
    venueDetails: [
      {
        roomId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "rooms",
          required: true,
        },
        startRollNo: { type: Number, required: true },
        endRollNo: { type: Number, required: true },
        rollNumbers: { type: [Number], required: true },
      },
    ],
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const SeatingArrangement =
  mongoose.models.seatingArrangements || mongoose.model("seatingArrangements", SeatingArrangementSchema);

export default SeatingArrangement;
