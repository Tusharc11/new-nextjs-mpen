import mongoose from "mongoose";

export interface IExamType extends Document {
  examType: string;
  academicYearId: string;
  examDate: Date;
  classId: string;
  subjectId: string;
  benchCapacity: number; //only show if isbenchcapacitycapture is true and then capture to render in seating arrangement
  clientOrganizationId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const ExamSchema = new mongoose.Schema(
  {
    examType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "examTypes",
      required: true,
    },
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sessions",
      required: true,
    },
    examDate: { type: Date, required: true },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subjects",
      required: true,
    },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    benchCapacity: { type: Number},
    isActive: { type: Boolean, default: true },
    addedDate: { type: Date, default: Date.now },
    modifiedDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const Exam =
  mongoose.models.exams || mongoose.model("exams", ExamSchema);

export default Exam;
