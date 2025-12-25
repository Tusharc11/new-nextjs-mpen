import { Class } from "../models/class";
import { Section } from "../models/section";
import { Room } from "../models/rooms";
import { Session } from "../models/session";
import { ExamType } from "../models/examType";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import "@/app/api/models/class";
import "@/app/api/models/section";
import "@/app/api/models/rooms";
import "@/app/api/models/session";
import "@/app/api/models/examType";

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
    
    const filter = { clientOrganizationId: { $in: [clientOrganizationId] } };

    const clientOrganizationFilter = { clientOrganizationId: clientOrganizationId };

    // Check if any entries exist in the required collections
    const [
      classesCount,
      sectionsCount,
      roomsCount,
      sessionsCount,
      examTypesCount
    ] = await Promise.all([
      Class.countDocuments(filter),
      Section.countDocuments(filter),
      Room.countDocuments(clientOrganizationFilter),
      Session.countDocuments(clientOrganizationFilter),
      ExamType.countDocuments(clientOrganizationFilter)
    ]);

    // If any collection has entries, basic setup is not needed
    const setupNeeded = (
      classesCount === 0 ||
      sectionsCount === 0 ||
      roomsCount === 0 ||
      sessionsCount === 0 ||
      examTypesCount === 0
    );

    const missingSetups = [];
    if (classesCount === 0) missingSetups.push({ name: 'Classes', path: '/manage-classes' });
    if (sectionsCount === 0) missingSetups.push({ name: 'Sections', path: '/manage-sections' });
    if (roomsCount === 0) missingSetups.push({ name: 'Rooms', path: '/manage-rooms' });
    if (sessionsCount === 0) missingSetups.push({ name: 'Sessions', path: '/manage-sessions' });
    if (examTypesCount === 0) missingSetups.push({ name: 'Exam Types', path: '/manage-exam-types' });

    return NextResponse.json({
      setupNeeded,
      missingSetups,
      counts: {
        classes: classesCount,
        sections: sectionsCount,
        rooms: roomsCount,
        sessions: sessionsCount,
        examTypes: examTypesCount
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check basic setup status" },
      { status: 500 }
    );
  }
} 