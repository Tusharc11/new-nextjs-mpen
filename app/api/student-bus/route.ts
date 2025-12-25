import dbConnect from "@/lib/mongodb";
import StudentBus from "../models/studentBus";
import Transport from "../models/transport";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { UserJwtPayload } from "@/lib/auth";
import mongoose from "mongoose";

const getTokenFromRequest = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.split(" ")[1];
  try {
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
    const studentId = searchParams.get("studentId");
    const id = searchParams.get("id");

    if (studentId) {
      // Fetch StudentBus data by studentId with complete transport and route details
      const studentBus = await StudentBus.findOne({
        studentId,
        isActive: true
      });

      if (!studentBus) {
        return NextResponse.json({
          message: "No transport assignment found for this student",
          data: null
        }, { status: 200 });
      }

      // Fetch transport details
      const transport = await Transport.findById(studentBus.transportId);
      if (!transport) {
        return NextResponse.json(
          { error: "Transport not found" },
          { status: 404 }
        );
      }

      // Find the specific route details
      const routeDetail = transport.routeDetails?.find(
        (route: any) => route.id.toString() === studentBus.routeDetailsId.toString()
      );

      if (!routeDetail) {
        return NextResponse.json(
          { error: "Route details not found" },
          { status: 404 }
        );
      }

      const response = {
        studentBus,
        transport: {
          _id: transport._id,
          number: transport.number,
          modelName: transport.modelName,
          vehicleNumber: transport.vehicleNumber,
          route: transport.route,
          installments: transport.installments,
          routeDetails: transport.routeDetails
        },
        selectedRoute: routeDetail
      };

      return NextResponse.json(response, { status: 200 });
    }

    if (id) {
      // Fetch specific StudentBus record by ID
      const studentBus = await StudentBus.findById(id)
        .populate("studentId", "firstName lastName email")
        .populate("classId", "classNumber")
        .populate("sectionId", "section")
        .populate("academicYearId", "startDate endDate")
        .populate("transportId");

      if (!studentBus) {
        return NextResponse.json(
          { error: "Student bus record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(studentBus, { status: 200 });
    }

    // Fetch all active StudentBus records (with pagination if needed)
    const studentBusRecords = await StudentBus.find({ isActive: true })
      .populate("studentId", "firstName lastName email")
      .populate("classId", "classNumber")
      .populate("sectionId", "section")
      .populate("academicYearId", "startDate endDate")
      .populate("transportId")
      .sort({ addedDate: -1 });

    return NextResponse.json(studentBusRecords, { status: 200 });

  } catch (error: any) {
    console.error("Error fetching student bus data:", error);
    return NextResponse.json(
      { error: "Failed to fetch student bus data", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, classId, sectionId, academicYearId, transportId, routeDetailsId } = body;

    // Validate required fields
    if (!studentId || !classId || !sectionId || !academicYearId || !transportId || !routeDetailsId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if student already has an active bus assignment
    const existingAssignment = await StudentBus.findOne({
      studentId,
      isActive: true
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Student already has an active bus assignment" },
        { status: 400 }
      );
    }

    // Verify that the transport and route exist
    const transport = await Transport.findById(transportId);
    if (!transport) {
      return NextResponse.json(
        { error: "Transport not found" },
        { status: 404 }
      );
    }

    const routeExists = transport.routeDetails?.some(
      (route: any) => route.id.toString() === routeDetailsId
    );

    if (!routeExists) {
      return NextResponse.json(
        { error: "Route not found in the selected transport" },
        { status: 404 }
      );
    }

    // Create new StudentBus record
    const studentBus = await StudentBus.create({
      studentId: new mongoose.Types.ObjectId(studentId),
      classId: new mongoose.Types.ObjectId(classId),
      sectionId: new mongoose.Types.ObjectId(sectionId),
      academicYearId: new mongoose.Types.ObjectId(academicYearId),
      transportId: new mongoose.Types.ObjectId(transportId),
      routeDetailsId: new mongoose.Types.ObjectId(routeDetailsId),
      isActive: true,
      addedDate: new Date()
    });

    return NextResponse.json(studentBus, { status: 201 });

  } catch (error: any) {
    console.error("Error creating student bus assignment:", error);
    return NextResponse.json(
      { error: "Failed to create student bus assignment", details: error.message },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Student bus ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const updateData = {
      ...body,
      modifiedDate: new Date()
    };

    // Convert string IDs to ObjectIds if provided
    if (body.studentId) updateData.studentId = new mongoose.Types.ObjectId(body.studentId);
    if (body.classId) updateData.classId = new mongoose.Types.ObjectId(body.classId);
    if (body.sectionId) updateData.sectionId = new mongoose.Types.ObjectId(body.sectionId);
    if (body.academicYearId) updateData.academicYearId = new mongoose.Types.ObjectId(body.academicYearId);
    if (body.transportId) updateData.transportId = new mongoose.Types.ObjectId(body.transportId);
    if (body.routeDetailsId) updateData.routeDetailsId = new mongoose.Types.ObjectId(body.routeDetailsId);

    const studentBus = await StudentBus.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (!studentBus) {
      return NextResponse.json(
        { error: "Student bus record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(studentBus, { status: 200 });

  } catch (error: any) {
    console.error("Error updating student bus assignment:", error);
    return NextResponse.json(
      { error: "Failed to update student bus assignment", details: error.message },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Student bus ID is required" }, { status: 400 });
    }

    // Soft delete by setting isActive to false
    const studentBus = await StudentBus.findByIdAndUpdate(
      id,
      { 
        isActive: false, 
        modifiedDate: new Date() 
      },
      { new: true }
    );

    if (!studentBus) {
      return NextResponse.json(
        { error: "Student bus record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Student bus assignment deactivated successfully" },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Error deleting student bus assignment:", error);
    return NextResponse.json(
      { error: "Failed to delete student bus assignment", details: error.message },
      { status: 500 }
    );
  }
}
