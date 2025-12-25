import mongoose from "mongoose";

const CourseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes", // Match the model name used in Class model
      required: true,
    },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    addedDate: {
      type: Date,
      default: Date.now,
    },
    modifiedDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Course =
  mongoose.models.courses || mongoose.model("courses", CourseSchema);

export default Course;
