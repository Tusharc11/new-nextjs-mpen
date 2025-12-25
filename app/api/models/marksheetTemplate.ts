import mongoose, { Schema, Document } from "mongoose";

// Interfaces for nested objects
export interface IMarksheetCard {
  id: string;
  heading: string;
  subHeading: string;
  fields: string[];
}

export interface IAcademicSelection {
  classIds: mongoose.Schema.Types.ObjectId[];
}

export interface IReportCardDetails {
  heading: string;
  logoBase64: string;
}

export interface IStudentField {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface IStudentDetailsConfig {
  fields: string[];
}

export interface IExamConfig {
  id: string;
  examTypeId: mongoose.Schema.Types.ObjectId;
  examTypeName?: string;
  occursIn?: "periodically" | "yearly" | "";
  subjectWiseTestCount?: number | "";
  maxMarks?: number;
  weightage: number;
}

// Main interface for the marksheet template document
export interface IMarksheetTemplate extends Document {
  classIds: mongoose.Schema.Types.ObjectId[];
  templateName: string;
  clientOrganizationId: mongoose.Schema.Types.ObjectId;
  reportCardDetails: IReportCardDetails;
  studentDetailsConfig: IStudentDetailsConfig;
  examConfigs: IExamConfig[];
  marksheetCards: IMarksheetCard[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}

// Schemas for nested objects
const MarksheetCardSchema = new Schema<IMarksheetCard>(
  {
    id: { type: String, required: true },
    heading: { type: String, required: true },
    subHeading: { type: String, default: "" },
    fields: [{ type: String, required: true }],
  },
  { _id: false }
);

const ReportCardDetailsSchema = new Schema<IReportCardDetails>(
  {
    heading: { type: String, default: "" },
    logoBase64: { type: String, default: "" },
  },
  { _id: false }
);

const StudentFieldSchema = new Schema<IStudentField>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const StudentDetailsConfigSchema = new Schema<IStudentDetailsConfig>(
  {
    fields: [{ type: String, required: true }],
  },
  { _id: false }
);

const ExamConfigSchema = new Schema<IExamConfig>(
  {
    id: { type: String, required: true },
    examTypeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    examTypeName: { type: String, default: "" },
    occursIn: {
      type: String,
      enum: ["periodically", "yearly", ""],
      default: "",
    },
    subjectWiseTestCount: { type: Schema.Types.Mixed, default: "" },
    maxMarks: { type: Number, default: 100 },
    weightage: { type: Number, default: 0 },
  },
  { _id: false }
);

// Main marksheet template schema
const MarksheetTemplateSchema = new Schema<IMarksheetTemplate>(
  {
    classIds: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "classes",
      required: true,
      validate: {
        validator: function (classIds: mongoose.Schema.Types.ObjectId[]) {
          return classIds.length > 0;
        },
        message: "At least one class is required",
      },
    },
    templateName: {
      type: String,
      required: [true, "Template name is required"],
      trim: true,
      maxlength: [100, "Template name cannot exceed 100 characters"],
    },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: true,
    },
    reportCardDetails: {
      type: ReportCardDetailsSchema,
      default: { heading: "", logoBase64: "" },
    },
    studentDetailsConfig: {
      type: StudentDetailsConfigSchema,
      default: { fields: [] },
    },
    examConfigs: {
      type: [ExamConfigSchema],
      default: [],
      validate: {
        validator: function (configs: IExamConfig[]) {
          // Validate total weightage doesn't exceed 100%
          const totalWeightage = configs.reduce(
            (sum, config) => sum + (config.weightage || 0),
            0
          );
          return totalWeightage <= 100;
        },
        message: "Total weightage cannot exceed 100%",
      },
    },
    marksheetCards: {
      type: [MarksheetCardSchema],
      required: [true, "At least one marksheet card is required"],
      validate: {
        validator: function (cards: IMarksheetCard[]) {
          return cards.length > 0;
        },
        message: "At least one marksheet card is required",
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: "marksheetTemplates",
  }
);

// Indexes for better query performance
MarksheetTemplateSchema.index({ classIds: 1 });
MarksheetTemplateSchema.index({ createdAt: -1 });
MarksheetTemplateSchema.index({ templateName: 1 });
MarksheetTemplateSchema.index({ clientOrganizationId: 1 });

// Pre-save middleware for additional validation
MarksheetTemplateSchema.pre("save", function (next) {
  const template = this as IMarksheetTemplate;

  // Validate marksheet cards have required fields
  for (const card of template.marksheetCards) {
    if (!card.heading || card.heading.trim().length === 0) {
      next(new Error(`Marksheet card heading is required`));
      return;
    }
    if (
      !card.fields ||
      card.fields.length === 0 ||
      !card.fields.some((field) => field.trim())
    ) {
      next(
        new Error(
          `Marksheet card "${card.heading}" must have at least one field`
        )
      );
      return;
    }
  }

  next();
});

// Static methods can be added here if needed in the future

// Instance methods
MarksheetTemplateSchema.methods.getSummary = function () {
  const template = this as IMarksheetTemplate;
  return {
    id: template._id,
    templateName: template.templateName,
    classIds: template.classIds,
    cardsCount: template.marksheetCards.length,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
};

// Create and export the model
const MarksheetTemplate =
  mongoose.models.MarksheetTemplate ||
  mongoose.model<IMarksheetTemplate>(
    "MarksheetTemplate",
    MarksheetTemplateSchema
  );

export default MarksheetTemplate;
