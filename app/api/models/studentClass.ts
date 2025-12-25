import mongoose from "mongoose";

const StudentClassSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users", // Match the model name used in Student model
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes", // Match the model name used in Class model
      required: true,
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sections", // Match the model name used in Section model
      required: true,
    },
    subjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "subjects", // Match the model name used in Subject model
        required: true,
        default: [],
      },
    ],
    academicYear: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sessions", // Match the model name used in AcademicYear model
      required: true,
    },
    rollNumber: {
      type: Number,
      required: true,
    },
    isBusTaken: {
      type: Boolean,
      default: false,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transport",
      required: false,
    },
    routeId: {
      type: String,
      required: false,
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

export const StudentClass =
  mongoose.models.studentClasses ||
  mongoose.model("studentClasses", StudentClassSchema);

export default StudentClass;
