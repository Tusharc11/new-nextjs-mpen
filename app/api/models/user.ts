import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  bloodGroup: string;
  gender: string;
  parentPhoneNumber: string;
  phoneNumber: string;
  address: string;
  role: string;
  dateJoined: Date;
  isClassTeacher: boolean;
  classId: string;
  sectionId: string;
  clientOrganizationId: string;
  lastLogin: Date;
  profileImage: string;
  statusMessage: string;
  isActive: boolean;
  phone: string;
  aboutMe: string;
}

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true, default: new Date() },
    bloodGroup: { type: String, required: false },
    gender: { type: String, required: true, default: 'Prefer not to say' },
    parentPhoneNumber: { type: String, required: false },
    phoneNumber: { type: String, required: false },
    address: { type: String, required: true },
    role: { type: String, required: true },
    dateJoined: { type: Date, required: true },
    isClassTeacher: { type: Boolean, default: false },
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
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientorganizations",
      required: false,
    },
    lastLogin: { type: Date, required: false },
    isActive: { type: Boolean, default: true },
    profileImage: { type: String, required: false },
    statusMessage: { type: String, required: false },
    phone: { type: String, required: false },
    aboutMe: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

export const User =
  mongoose.models.users || mongoose.model("users", userSchema);

export default User;
