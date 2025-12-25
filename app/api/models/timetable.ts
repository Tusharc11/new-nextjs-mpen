import mongoose from "mongoose";

export interface ITimetable extends mongoose.Document {
  title: string;
  fileName: string;
  fileData: Buffer;
  mimeType: string;
  academicYearId: string;
  clientOrganizationId: string;
  isStudentTimetable: boolean;
  classId: string;
  sectionId: string;
  uploadedBy: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const TimetableSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileData: {
    type: Buffer,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
    validate: {
      validator: function (v: string) {
        return v === "application/pdf";
      },
      message: "Only PDF files are allowed",
    },
  },
  academicYearId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "sessions",
    required: true,
  },
  clientOrganizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "clientorganizations",
    required: true,
  },
  isStudentTimetable: {
    type: Boolean,
    default: false,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "classes",
    required: false,
  },
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "sections",
    required: false,
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
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
    default: Date.now,
  },
});

// Update modifiedDate on save
TimetableSchema.pre("save", function (next) {
  this.modifiedDate = new Date();
  next();
});

const Timetable =
  mongoose.models.Timetable ||
  mongoose.model<ITimetable>("Timetable", TimetableSchema);
export default Timetable;
