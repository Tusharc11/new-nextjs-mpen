import mongoose from "mongoose";

export interface IResult extends Document {
  examDate: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  staffId: string;
  totalMarks: number;
  passingMarks: number;
  results: {
    studentId: string;
    marks: number | null;
    grade: string | null;
    percentage: number | null;
    present: boolean;
    remark: string | null;
  }[];
  examType: string;
  clientOrganizationId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const ResultSchema = new mongoose.Schema(
  {
    examDate: { type: Date, required: true },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "classes",
      required: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sections",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subjects",
      required: true,
    },
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    totalMarks: { type: Number, required: true },
    passingMarks: { type: Number, required: true },
    results: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        marks: { type: Number, default: null },
        grade: { type: String, required: false, default: null },
        percentage: { type: Number, required: false, default: null },
        present: { type: Boolean, required: true },
        remark: { type: String, required: false, default: null },
      },
    ],
    examType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "examTypes",
      required: true,
    },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
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

export const Result =
  mongoose.models.results || mongoose.model("results", ResultSchema);

export default Result;
