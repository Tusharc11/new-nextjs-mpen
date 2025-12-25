import mongoose, { Document } from "mongoose";

export interface ISubject extends Document {
  subject: string;
  clientOrganizationId: string;
  courseId: string;
  sectionIds: string[];
  staffIds: string[];
  academicYearId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const SubjectSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "courses",
      required: true,
    },
    sectionIds: [
      { type: mongoose.Schema.Types.ObjectId, ref: "sections", required: true },
    ],
    staffIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "users" }],
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sessions",
      required: true,
    },
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Subject =
  mongoose.models.subjects || mongoose.model("subjects", SubjectSchema);

export default Subject;
