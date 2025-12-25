import mongoose, { Schema, Document } from "mongoose";

// Interface for driver details
export interface IDriverDetails {
  name: string;
  licenseNumber: string;
  phoneNumber: string;
  address?: string; // Optional
  experience?: number; // Optional - years of experience
  dateOfBirth?: Date; // Optional
}

// Interface for insurance details
export interface IInsuranceDetails {
  policyNumber?: string; // Optional
  provider?: string; // Optional
  expiryDate?: Date; // Optional
  coverageAmount?: number; // Optional
  policyType?: string; // Optional
}

// Interface for PUC details
export interface IPUCDetails {
  certificateNumber?: string; // Optional
  issueDate?: Date; // Optional
  expiryDate?: Date; // Optional
  issuingAuthority?: string; // Optional
}

// Interface for conductor details
export interface IConductorDetails {
  name?: string; // Optional
  phoneNumber?: string; // Optional
  address?: string; // Optional
  experience?: number; // Optional - years of experience
  dateOfBirth?: Date; // Optional
}

// Interface for route details
export interface IRouteDetails {
  id: mongoose.Schema.Types.ObjectId;
  destination: string;
  amount: number;
}

// Installment type options
export enum Installments {
  MONTHLY = "monthly",
  THREE_MONTHS = "3months", 
  FOUR_MONTHS = "4months",
  SIX_MONTHS = "6months",
  YEARLY = "yearly"
}

// Interface for document upload
export interface IDocumentUpload {
  filename: string;
  fileType: string; // 'image' or 'pdf'
  mimeType: string; // e.g., 'image/jpeg', 'application/pdf'
  size: number; // Original file size in bytes
  compressedSize: number; // Compressed file size in bytes
  data: string; // Base64 encoded compressed data
  uploadDate: Date;
}

export interface ITransport extends Document {
  number: number; // Auto-generated sequential number
  modelName: string;
  vehicleNumber: string;
  capacity?: number; // Optional
  route: string;
  routeDetails?: IRouteDetails[]; // Optional route details with destinations and amounts
  insuranceDetails?: IInsuranceDetails; // Optional
  driver1Details: IDriverDetails;
  driver2Details?: IDriverDetails; // Optional second driver
  conductorDetails?: IConductorDetails; // Optional conductor
  averageFuelCostPerMonth?: number; // Optional
  installments: Installments; // Required installment type
  pucDetails?: IPUCDetails; // Optional
  documents?: IDocumentUpload[]; // Optional uploaded documents
  clientOrganizationId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

// Driver schema
const DriverDetailsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  licenseNumber: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  address: { type: String, required: false },
  experience: { type: Number, required: false, min: 0 },
  dateOfBirth: { type: Date, required: false }
}, { _id: false });

// Insurance schema
const InsuranceDetailsSchema = new mongoose.Schema({
  policyNumber: { type: String, required: false },
  provider: { type: String, required: false },
  expiryDate: { type: Date, required: false },
  coverageAmount: { type: Number, required: false, min: 0 },
  policyType: { type: String, required: false }
}, { _id: false });

// Conductor schema
const ConductorDetailsSchema = new mongoose.Schema({
  name: { type: String, required: false },
  phoneNumber: { type: String, required: false },
  address: { type: String, required: false },
  experience: { type: Number, required: false, min: 0 },
  dateOfBirth: { type: Date, required: false }
}, { _id: false });

// PUC schema
const PUCDetailsSchema = new mongoose.Schema({
  certificateNumber: { type: String, required: false },
  issueDate: { type: Date, required: false },
  expiryDate: { type: Date, required: false },
  issuingAuthority: { type: String, required: false }
}, { _id: false });

// Route details schema
const RouteDetailsSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.ObjectId, required: true, default: () => new mongoose.Types.ObjectId() },
  destination: { type: String, required: true },
  amount: { type: Number, required: true, min: 0, default: 0 }
}, { _id: false });

// Document upload schema
const DocumentUploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  fileType: { 
    type: String, 
    required: true,
    enum: ['image', 'pdf']
  },
  mimeType: { 
    type: String, 
    required: true,
    enum: [
      'image/jpeg', 'image/jpg', 'image/png', 'application/pdf'
    ]
  },
  size: { type: Number, required: true, min: 1 },
  compressedSize: { type: Number, required: true, min: 1 },
  data: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now }
}, { _id: false });

const TransportSchema = new mongoose.Schema(
  {
    number: { 
      type: Number, 
      required: true,
      min: 1
    },
    modelName: { type: String, required: true },
    vehicleNumber: { 
      type: String, 
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    capacity: { 
      type: Number, 
      required: false,
      min: 1,
      max: 100
    },
    route: { type: String, required: true },
    routeDetails: {
      type: [RouteDetailsSchema],
      required: false
    },
    insuranceDetails: {
      type: InsuranceDetailsSchema,
      required: false
    },
    driver1Details: {
      type: DriverDetailsSchema,
      required: true
    },
    driver2Details: {
      type: DriverDetailsSchema,
      required: false
    },
    conductorDetails: {
      type: ConductorDetailsSchema,
      required: false
    },
    averageFuelCostPerMonth: {
      type: Number,
      required: false,
      min: 0
    },
    installments: {
      type: String,
      required: true,
      enum: Object.values(Installments)
    },
    pucDetails: {
      type: PUCDetailsSchema,
      required: false
    },
    documents: {
      type: [DocumentUploadSchema],
      required: false,
      validate: {
        validator: function(documents: IDocumentUpload[]) {
          // Validate total size doesn't exceed 6MB (6 * 1024 * 1024 bytes)
          if (!documents || documents.length === 0) return true;
          const totalSize = documents.reduce((sum, doc) => sum + doc.compressedSize, 0);
          return totalSize <= 6 * 1024 * 1024;
        },
        message: 'Total document size cannot exceed 6MB'
      }
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

// Add indexes for efficient queries
TransportSchema.index({ vehicleNumber: 1, clientOrganizationId: 1 }, { unique: true });
TransportSchema.index({ number: 1, clientOrganizationId: 1 }, { unique: true });
TransportSchema.index({ route: 1, clientOrganizationId: 1 });
TransportSchema.index({ isActive: 1, clientOrganizationId: 1 });

export const Transport =
  mongoose.models.transport || mongoose.model("transport", TransportSchema);

export default Transport;
