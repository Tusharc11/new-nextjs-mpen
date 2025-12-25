import { Class } from "../models/class";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import Course from "../models/course";

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
    return null;
  }
};

export async function GET(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    let clientOrganizationId = searchParams.get("clientOrganizationId");
    if (!clientOrganizationId) {
      clientOrganizationId = token.clientOrganizationId;
    }
    const classes = await Class.find({
      clientOrganizationId: { $in: [clientOrganizationId] },
    }).sort({ classNumber: 1 });
    return NextResponse.json(classes);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch classes" },
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
    const { classNumber, clientOrganizationId } = await request.json();

    if (!clientOrganizationId) {
      return NextResponse.json(
        { error: "Client organization ID is required" },
        { status: 400 }
      );
    }

    const existingClass = await Class.findOne({ classNumber });

    if (existingClass) {
      const updatedClass = await Class.findByIdAndUpdate(
        { _id: existingClass._id },
        {
          $addToSet: { clientOrganizationId: clientOrganizationId },
          modifiedDate: new Date(),
        },
        { new: true }
      );
      return NextResponse.json(updatedClass);
    }

    const newClass = new Class({
      classNumber,
      clientOrganizationId: [clientOrganizationId],
      isActive: true,
    });
    await newClass.save();
    return NextResponse.json(newClass);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create class" },
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

    // Get classId from query parameters to match frontend call
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("id");
    let clientOrganizationId = searchParams.get("clientOrganizationId");
    if (!clientOrganizationId) {
      clientOrganizationId = token.clientOrganizationId;
    }

    if (!classId || !clientOrganizationId) {
      return NextResponse.json(
        { error: "Class ID and client organization ID are required" },
        { status: 400 }
      );
    }

    // Check if there are active courses for this class and organization
    const courses = await Course.find({
      class: classId,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    });

    if (courses.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete class as it has courses assigned to it. Please remove or edit the class for all courses first." 
        },
        { status: 400 }
      );
    }

    // Remove the clientOrganizationId from the array
    const updatedClass = await Class.findOneAndUpdate(
      { 
        _id: classId,
        clientOrganizationId: clientOrganizationId 
      },
      { 
        $pull: { clientOrganizationId: clientOrganizationId },
        modifiedDate: new Date()
      },
      { new: true }
    );

    if (!updatedClass) {
      return NextResponse.json(
        { error: "Class not found or you don't have permission to remove this organization" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Class deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete class" },
      { status: 500 }
    );
  }
}
