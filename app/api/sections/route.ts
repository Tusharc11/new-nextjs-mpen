import dbConnect from "@/lib/mongodb";
import Section from "@/app/api/models/section";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import StudentClass from "../models/studentClass";
import mongoose from "mongoose";
import Subject from "../models/subject";

const getTokenFromRequest = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {

    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
    // Verify and decode the token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as UserJwtPayload;
    return decoded;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    const academicYearId = request.nextUrl.searchParams.get("academicYearId");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let clientOrganizationId = searchParams.get("clientOrganizationId");
    if (!clientOrganizationId) {
      clientOrganizationId = token.clientOrganizationId;
    }

    if (academicYearId) {
      const academicYearObjectId = new mongoose.Types.ObjectId(academicYearId);
      const clientOrganizationObjectId = new mongoose.Types.ObjectId(
        clientOrganizationId
      );

      const aggregationPipeline = [
        {
          $lookup: {
            from: "sections",
            localField: "section",
            foreignField: "_id",
            as: "sections",
          },
        },
        {
          $match: {
            academicYear: academicYearObjectId,
            "sections.clientOrganizationId": {
              $in: [clientOrganizationObjectId],
            },
          },
        },
        {
          $unwind: "$sections",
        },
        {
          $group: {
            _id: "$class",
            sectionList: {
              $addToSet: "$sections",
            },
          },
        },
        {
          $project: {
            sectionList: "$sectionList",
          },
        },
      ];

      const sections = await StudentClass.aggregate(aggregationPipeline);
      return NextResponse.json(sections);
    } else {
      const sections = await Section.find({
        clientOrganizationId: { $in: [clientOrganizationId] },
      }).sort({ section: 1 });
      return NextResponse.json(sections);
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sections" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // const clientOrganizationId = token.clientOrganizationId;
    const { section, clientOrganizationId } = await request.json();

    const existingSection = await Section.findOne({ section });
    if (existingSection) {
      const updatedSection = await Section.findByIdAndUpdate(
        { _id: existingSection._id },
        {
          $addToSet: { clientOrganizationId: clientOrganizationId },
          modifiedDate: new Date(),
        },
        { new: true }
      );
      return NextResponse.json(updatedSection);
    }

    const newSection = new Section({
      section,
      clientOrganizationId: [clientOrganizationId],
      isActive: true,
      modifiedDate: new Date(),
    });
    await newSection.save();
    return NextResponse.json(newSection);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create section" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sectionId from query parameters to match frontend call
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("id");
    const clientOrganizationId = searchParams.get("clientOrganizationId");

    if (!sectionId || !clientOrganizationId) {
      return NextResponse.json(
        { error: "Section ID and client organization ID are required" },
        { status: 400 }
      );
    }

    const sectionToDelete = await Section.findOne({
      _id: sectionId,
      clientOrganizationId: { $in: [clientOrganizationId] },
    });
    if (!sectionToDelete) {
      return NextResponse.json({ error: "Section not found" }, { status: 404 });
    }

    const seatingArrangements = await Subject.find({
      sectionId: { $in: [sectionId] },
      clientOrganizationId: clientOrganizationId,
      isActive: true
    });

    if (seatingArrangements.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete section as it is currently being used in seating arrangements. Please remove the section from all seating arrangements first." 
        },
        { status: 400 }
      );
    }

    await Section.findByIdAndUpdate(sectionId, {
      $pull: { clientOrganizationId: clientOrganizationId },
    },
      { new: true }
    );
    return NextResponse.json({ message: "Section deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete section" },
      { status: 500 }
    );
  }
}
