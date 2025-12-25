import mongoose from "mongoose";

export interface IAttendance extends Document {
  academicYearId: string;
  subjectId: string;
  classId: string;
  sectionId: string;
  staffId: string;
  attendanceDate: string;
  studentAttendance: { studentId: string; status: string }[];
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const AttendanceSchema = new mongoose.Schema(
  {
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sessions",
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "subjects",
      required: true,
    },
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
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    attendanceDate: { type: Date, required: true },
    studentAttendance: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "users",
          required: true,
        },
        status: { type: String, required: true, enum: ["P", "A"] },
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

export const Attendance =
  mongoose.models.attendance ||
  mongoose.model("attendance", AttendanceSchema, "attendance");

export default Attendance;
