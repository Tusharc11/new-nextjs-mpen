import dbConnect from "@/lib/mongodb";
import { Room } from "../models/rooms";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { SeatingArrangement } from "../models/seatingArrangement";

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

    const { searchParams } = new URL(request.url);
    const studentRoomType = request.nextUrl.searchParams.get("studentRoomType");

    // Get token from request
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // const clientOrganizationId = token.clientOrganizationId;
    let clientOrganizationId = searchParams.get("clientOrganizationId");
    if (!clientOrganizationId) {
      clientOrganizationId = token.clientOrganizationId;
    }

    if (studentRoomType) {
      const roomTypes = studentRoomType.split(",");
      const rooms = await Room.find({
        clientOrganizationId,
        studentRoomType: { $in: roomTypes },
        isActive: true,
      }).sort({ room: 1 });

      return NextResponse.json(rooms);
    }

    const rooms = await Room.find({
      clientOrganizationId,
    }).sort({ room: 1 });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // const clientOrganizationId = token.clientOrganizationId;
    const clientOrganizationId = body.clientOrganizationId;
    body.clientOrganizationId = clientOrganizationId;
    const existingRoom = await Room.findOne({
      room: body.room,
      clientOrganizationId: clientOrganizationId
    });
    if (existingRoom) {
      return NextResponse.json({ error: `${body.room} Classroom already exists` }, { status: 400 });
    }
    const room = await Room.create({
      ...body,
      isActive: true
    });
    return NextResponse.json(room);
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
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

    // Get roomId from query parameters to match frontend call
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("id");
    const clientOrganizationId = searchParams.get("clientOrganizationId");

    if (!roomId || !clientOrganizationId) {
      return NextResponse.json(
        { error: "Room ID and client organization ID are required" },
        { status: 400 }
      );
    }

    // Check if room exists for this organization
    const roomExists = await Room.findOne({
      _id: roomId,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    });
    if (!roomExists) {
      return NextResponse.json(
        { error: "Room not found" },
        { status: 404 }
      );
    }

    const seatingArrangements = await SeatingArrangement.find({
      "venueDetails.roomId": roomId,
      isActive: true,
      clientOrganizationId: clientOrganizationId
    });

    if (seatingArrangements.length > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete room as it is currently being used in seating arrangements. Please remove the room from all seating arrangements first." 
        },
        { status: 400 }
      );
    }
    
    // Soft delete by setting isActive to false
    const updatedRoom = await Room.findOneAndUpdate(
      {
        _id: roomId,
        clientOrganizationId: clientOrganizationId
      },
      {
        isActive: false
      },
      { new: true }
    );

    if (!updatedRoom) {
      return NextResponse.json(
        { error: "Room not found or you don't have permission to delete it" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Room deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
