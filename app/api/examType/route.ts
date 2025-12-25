import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import ExamType from "../models/examType";
import dbConnect from "@/lib/mongodb";
import Exam from "../models/exam";

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
    await dbConnect();

    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    let clientOrganizationId = searchParams.get("clientOrganizationId");
    if (!clientOrganizationId) {
      clientOrganizationId = token.clientOrganizationId;
    }

    const examTypes = await ExamType.find({
      isActive: true,
      clientOrganizationId: clientOrganizationId,
    });

    return NextResponse.json(examTypes);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch exam types" },
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

    const body = await request.json();
    const clientOrganizationId =
      body.clientOrganizationId || token.clientOrganizationId;

    if (!body.type) {
      return NextResponse.json({ error: "Type is required" }, { status: 400 });
    }

    const examType = new ExamType({
      type: body.type,
      clientOrganizationId: clientOrganizationId,
      defaultBenchCapacity: body.defaultBenchCapacity,
    });

    await examType.save();
    return NextResponse.json(examType, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create exam type" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get examTypeId from query parameters to match frontend call
    const { searchParams } = new URL(request.url);
    const examTypeId = searchParams.get("id");
    const clientOrganizationId = searchParams.get("clientOrganizationId");

    if (!examTypeId || !clientOrganizationId) {
      return NextResponse.json(
        { error: "Exam type ID and client organization ID are required" },
        { status: 400 }
      );
    }

    // Check if exam type exists for this organization
    const examTypeExists = await ExamType.findOne({
      _id: examTypeId,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    });
    if (!examTypeExists) {
      return NextResponse.json(
        { error: "Exam type not found" },
        { status: 404 }
      );
    }

    const exams = await Exam.find({
      examType: examTypeId,
      isActive: true,
      clientOrganizationId: clientOrganizationId
    });

    if (exams.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete exam type as it is currently being used in exams. Please remove or edit the exam type for all exams first." 
        },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    const updatedExamType = await ExamType.findOneAndUpdate(
      {
        _id: examTypeId,
        clientOrganizationId: clientOrganizationId
      },
      {
        isActive: false
      },
      { new: true }
    );

    if (!updatedExamType) {
      return NextResponse.json(
        { error: "Exam type not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Exam type deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete exam type" },
      { status: 500 }
    );
  }
}
