import dbConnect from "@/lib/mongodb";
import Subject from "../models/subject";
import { NextRequest, NextResponse } from "next/server";
import User from "@/app/api/models/user";
import { Course } from "../models/course";
import Session from "../models/session";
import Attendance from "../models/attendance";
import { Section } from "../models/section";
import Class from "../models/class";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const data = await request.json();

    // Verify that class and section exist
    const subjectExists = await Subject.findById(data.subjectId);
    const academicYearExists = await Session.findById(data.academicYearId);
    const sectionExists = await Section.findById(data.sectionId);
    const classExists = await Class.findById(data.classId);

    if (
      !subjectExists ||
      !academicYearExists ||
      !sectionExists ||
      !classExists
    ) {
      return NextResponse.json(
        { error: "Invalid subject or academic year or section or class" },
        { status: 400 }
      );
    }

    // Verify all staff IDs exist
    const studentIds = Array.isArray(data.studentAttendance)
      ? data.studentAttendance.map(
          (student: { studentId: string }) => student.studentId
        )
      : [data.studentAttendance.studentId];
    const studentCount = await User.countDocuments({
      _id: { $in: studentIds },
    });

    if (studentCount !== studentIds.length) {
      return NextResponse.json(
        { error: "One or more students not found" },
        { status: 400 }
      );
    }

    const attendance = await Attendance.create({
      academicYearId: data.academicYearId,
      subjectId: data.subjectId,
      classId: data.classId,
      sectionId: data.sectionId,
      staffId: data.staffId,
      studentAttendance: data.studentAttendance,
      attendanceDate: data.attendanceDate,
      isActive: true,
    });

    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const subjectId = searchParams.get("subjectId");
    const sectionId = searchParams.get("sectionId");
    const attendanceDate = searchParams.get("attendanceDate");
    const classId = searchParams.get("classId");

    if (!subjectId || !sectionId || !attendanceDate || !classId) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const attendance = await Attendance.find({
      subjectId: subjectId,
      classId: classId,
      sectionId: sectionId,
      attendanceDate: attendanceDate,
    })
      .populate("studentAttendance")
      .select("-__v");

    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const data = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Attendance ID is required" },
        { status: 400 }
      );
    }

    // Find by ID
    const attendanceExists = await Attendance.findById(id);
    if (!attendanceExists) {
      return NextResponse.json(
        { error: "Invalid attendance" },
        { status: 400 }
      );
    }

    const attendance = await Attendance.findByIdAndUpdate(
      id,
      {
        studentAttendance: data.studentAttendance,
        modifiedDate: new Date(),
      },
      { new: true }
    )
      .populate("studentAttendance");

    if (!attendance) {
      return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update attendance" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const subject = await Subject.findByIdAndUpdate(id, { isActive: false });
    if (subject) {
      return NextResponse.json(subject, { status: 201 });
    } else {
      return NextResponse.json(
        { message: "subject not found to delete" },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json({ error: "No entry selected" }, { status: 500 });
  }
}
