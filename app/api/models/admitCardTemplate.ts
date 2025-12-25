import mongoose, { Schema, Document } from "mongoose";

// Interfaces for nested objects
export interface IAdmitCardDetails {
  logoBase64: string;
}

export interface IStudentField {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  isCustom?: boolean; // Flag to identify custom fields
}

export interface IStudentDetailsConfig {
  fields: IStudentField[];
}

export interface IAdmitCard {
  _id?: mongoose.Schema.Types.ObjectId;
  heading: string;
  subHeading: string;
  fields: string[]; // Simple string array for instructions - no custom fields
}

// Main interface for the admit card template document
export interface IAdmitCardTemplate extends Document {
  classIds: mongoose.Schema.Types.ObjectId[];
  templateName: string;
  clientOrganizationId: mongoose.Schema.Types.ObjectId;
  admitCardDetails: IAdmitCardDetails;
  studentDetailsConfig: IStudentDetailsConfig;
  admitCards: IAdmitCard[];
  createdAt: Date;
  updatedAt: Date;
  createdBy?: mongoose.Schema.Types.ObjectId;
  updatedBy?: mongoose.Schema.Types.ObjectId;
}

// Schemas for nested objects
const AdmitCardDetailsSchema = new Schema<IAdmitCardDetails>(
  {
    logoBase64: { type: String, default: "" },
  },
  { _id: false }
);

const StudentFieldSchema = new Schema<IStudentField>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    description: { type: String, default: "" },
    enabled: { type: Boolean, default: false },
    isCustom: { type: Boolean, default: false }, // Flag to identify custom fields
  },
  { _id: false }
);

const StudentDetailsConfigSchema = new Schema<IStudentDetailsConfig>(
  {
    fields: [StudentFieldSchema],
  },
  { _id: false }
);

const AdmitCardSchema = new Schema<IAdmitCard>(
  {
    heading: { type: String, default: "" },
    subHeading: { type: String, default: "" },
    fields: [{ type: String, default: "" }],
  },
  { _id: true }
); // Enable _id for ObjectId

// Main admit card template schema
const AdmitCardTemplateSchema = new Schema<IAdmitCardTemplate>(
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
    admitCardDetails: {
      type: AdmitCardDetailsSchema,
      default: { logoBase64: "" },
    },
    studentDetailsConfig: {
      type: StudentDetailsConfigSchema,
      default: { fields: [] },
    },
    admitCards: {
      type: [AdmitCardSchema],
      default: [],
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
    collection: "admitCardTemplates",
  }
);

// Indexes for better query performance
AdmitCardTemplateSchema.index({ classIds: 1 });
AdmitCardTemplateSchema.index({ createdAt: -1 });
AdmitCardTemplateSchema.index({ templateName: 1 });
AdmitCardTemplateSchema.index({ clientOrganizationId: 1 });

// Pre-save middleware for additional validation and data migration
AdmitCardTemplateSchema.pre("save", function (next) {
  const template = this as IAdmitCardTemplate;

  // Basic validation
  if (!template.templateName || template.templateName.trim().length === 0) {
    next(new Error("Template name is required"));
    return;
  }

  // Backward compatibility: Migrate old studentDetailsConfig structure
  if (
    template.studentDetailsConfig &&
    Array.isArray(template.studentDetailsConfig.fields)
  ) {
    const fields = template.studentDetailsConfig.fields;
    // Check if fields are strings (old format) or objects (new format)
    if (fields.length > 0 && typeof fields[0] === "string") {
      // Convert old string array to new object array
      const defaultStudentFields = [
        {
          id: "fullName",
          label: "Full Name",
          description: "Student's complete name (First + Last)",
          enabled: true,
          isCustom: false,
        },
        {
          id: "dateOfBirth",
          label: "Date of Birth",
          description: "Student's birth date",
          enabled: false,
          isCustom: false,
        },
        {
          id: "parentPhone",
          label: "Parent Phone Number",
          description: "Primary contact number",
          enabled: false,
          isCustom: false,
        },
        {
          id: "address",
          label: "Address",
          description: "Student's residential address",
          enabled: false,
          isCustom: false,
        },
        {
          id: "bloodGroup",
          label: "Blood Group",
          description: "Student's blood group",
          enabled: false,
          isCustom: false,
        },
        {
          id: "gender",
          label: "Gender",
          description: "Student's gender",
          enabled: false,
          isCustom: false,
        },
        {
          id: "rollNumber",
          label: "Roll Number",
          description: "Student's class roll number",
          enabled: true,
          isCustom: false,
        },
        {
          id: "studentId",
          label: "Student ID",
          description: "Unique student identification number",
          enabled: false,
          isCustom: false,
        },
      ];

      const enabledFieldIds = fields as unknown as string[];
      const migratedFields = defaultStudentFields.map((field) => ({
        ...field,
        enabled: enabledFieldIds.includes(field.id),
      }));

      template.studentDetailsConfig.fields = migratedFields;
    }
  }

  // Ensure admitCards exists
  if (!template.admitCards || template.admitCards.length === 0) {
    template.admitCards = [];
  }

  next();
});

// Post-find middleware for backward compatibility when retrieving data
AdmitCardTemplateSchema.post(
  ["find", "findOne", "findOneAndUpdate"],
  function (docs) {
    if (!docs) return;

    const documents = Array.isArray(docs) ? docs : [docs];

    documents.forEach((doc: any) => {
      if (!doc) return;

      // Ensure admitCards exists
      if (!doc.admitCards || doc.admitCards.length === 0) {
        doc.admitCards = [];
      }

      // Backward compatibility: Migrate old studentDetailsConfig structure
      if (
        doc.studentDetailsConfig &&
        Array.isArray(doc.studentDetailsConfig.fields)
      ) {
        const fields = doc.studentDetailsConfig.fields;
        if (fields.length > 0 && typeof fields[0] === "string") {
          const defaultStudentFields = [
            {
              id: "fullName",
              label: "Full Name",
              description: "Student's complete name (First + Last)",
              enabled: true,
              isCustom: false,
            },
            {
              id: "dateOfBirth",
              label: "Date of Birth",
              description: "Student's birth date",
              enabled: false,
              isCustom: false,
            },
            {
              id: "parentPhone",
              label: "Parent Phone Number",
              description: "Primary contact number",
              enabled: false,
              isCustom: false,
            },
            {
              id: "address",
              label: "Address",
              description: "Student's residential address",
              enabled: false,
              isCustom: false,
            },
            {
              id: "bloodGroup",
              label: "Blood Group",
              description: "Student's blood group",
              enabled: false,
              isCustom: false,
            },
            {
              id: "gender",
              label: "Gender",
              description: "Student's gender",
              enabled: false,
              isCustom: false,
            },
            {
              id: "rollNumber",
              label: "Roll Number",
              description: "Student's class roll number",
              enabled: true,
              isCustom: false,
            },
            {
              id: "studentId",
              label: "Student ID",
              description: "Unique student identification number",
              enabled: false,
              isCustom: false,
            },
          ];

          const enabledFieldIds = fields as unknown as string[];
          const migratedFields = defaultStudentFields.map((field) => ({
            ...field,
            enabled: enabledFieldIds.includes(field.id),
          }));

          doc.studentDetailsConfig.fields = migratedFields;
        }
      }
    });
  }
);

// Instance methods
AdmitCardTemplateSchema.methods.getSummary = function () {
  const template = this as IAdmitCardTemplate;
  return {
    id: template._id,
    templateName: template.templateName,
    classIds: template.classIds,
    cardCount: template.admitCards.length,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
};

// Create and export the model
const AdmitCardTemplate =
  mongoose.models.AdmitCardTemplate ||
  mongoose.model<IAdmitCardTemplate>(
    "AdmitCardTemplate",
    AdmitCardTemplateSchema
  );

export default AdmitCardTemplate;
