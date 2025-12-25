import dbConnect from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Session from "../models/session";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
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
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // const clientOrganizationId = token.clientOrganizationId;
    const { startDate, endDate, clientOrganizationId } = await request.json();

    const session = await Session.create({
      startDate: startDate,
      endDate: endDate,
      clientOrganizationId: clientOrganizationId,
      isActive: true,
      addedDate: new Date(),
    });

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // const clientOrganizationId = token.clientOrganizationId;

    const { searchParams } = new URL(request.url);
    let clientOrganizationId = searchParams.get("clientOrganizationId");
    if (!clientOrganizationId) {
      clientOrganizationId = token.clientOrganizationId;
    }

    const id = searchParams.get("id");
    if (id) {
      const session = await Session.findOne({
        _id: id,
        isActive: true,
        clientOrganizationId,
      });

      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(session);
    } else {
      const sessions = await Session.find({
        isActive: true,
        clientOrganizationId,
      }).select("-__v");

      return NextResponse.json(sessions);
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const data = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const session = await Session.findByIdAndUpdate(
      id,
      {
        startDate: data.startDate,
        endDate: data.endDate,
        modifiedDate: new Date(),
      },
      { new: true }
    ).where({ clientOrganizationId });

    return NextResponse.json(session);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const clientOrganizationId = searchParams.get("clientOrganizationId");
    
    if (!id || !clientOrganizationId) {
      return NextResponse.json(
        { error: "Session ID and client organization ID are required" },
        { status: 400 }
      );
    }

    // Check if session exists for this organization
    const sessionExists = await Session.findOne({
      _id: id,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    });
    if (!sessionExists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const subject = await Subject.find({
      academicYearId: id,
      isActive: true,
      clientOrganizationId: clientOrganizationId
    });

    if (subject.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete session as it has subjects assigned to it. Please edit or remove all subjects/students from this session first." 
        },
        { status: 400 }
      );
    }

    // Soft delete by setting isActive to false
    const updatedSession = await Session.findOneAndUpdate(
      {
        _id: id,
        clientOrganizationId: clientOrganizationId
      },
      {
        isActive: false
      },
      { new: true }
    );

    if (!updatedSession) {
      return NextResponse.json(
        { error: "Session not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Session deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
