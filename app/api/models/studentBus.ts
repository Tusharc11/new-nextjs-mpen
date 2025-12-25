import mongoose, { Schema, Document } from "mongoose";

export interface IStudentBus extends Document {
  studentId: string;
  classId: string;
  sectionId: string;
  academicYearId: string;
  transportId: string;
  routeDetailsId: mongoose.Schema.Types.ObjectId;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const StudentBusSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
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
    academicYearId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "sessions",
      required: true,
    },
    transportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transport",
      required: true,
    },
    routeDetailsId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    addedDate: { 
      type: Date, 
      default: Date.now 
    },
    modifiedDate: { 
      type: Date 
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for efficient queries
StudentBusSchema.index({ studentId: 1, isActive: 1 });
StudentBusSchema.index({ transportId: 1, routeDetailsId: 1, isActive: 1 });
StudentBusSchema.index({ classId: 1, sectionId: 1, academicYearId: 1, isActive: 1 });

export const StudentBus =
  mongoose.models.studentBus || mongoose.model("studentBus", StudentBusSchema);

export default StudentBus;
