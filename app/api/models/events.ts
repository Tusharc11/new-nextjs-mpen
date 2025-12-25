import mongoose from "mongoose";
import { IUser } from "./user";

export interface IEvent extends Document {
  _id: string;
  name: string;
  summary: string;
  details?: string;
  photo1?: string;
  photo2?: string;
  photo3?: string;
  startDate: Date;
  endDate?: Date;
  createdBy: IUser;
  clientOrganizationId: string;
  isActive: boolean;
  addedDate: Date;
  modifiedDate: Date;
}

const EventSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    summary: { 
      type: String, 
      required: true,
      trim: true 
    },
    details: { 
      type: String,
      trim: true 
    },
    photo1: { 
      type: String,
      trim: true 
    },
    photo2: { 
      type: String,
      trim: true 
    },
    photo3: { 
      type: String,
      trim: true 
    },
    startDate: { 
      type: Date, 
      required: true 
    },
    endDate: { 
      type: Date 
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    clientOrganizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "clientOrganizations",
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

// Add indexes for better query performance
EventSchema.index({ clientOrganizationId: 1, startDate: 1 });
EventSchema.index({ clientOrganizationId: 1, isActive: 1 });

// Middleware to update modifiedDate on update
EventSchema.pre('findOneAndUpdate', function() {
  this.set({ modifiedDate: new Date() });
});

export const Event =
  mongoose.models.events ||
  mongoose.model("events", EventSchema, "events");

export default Event;
