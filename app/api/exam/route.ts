import dbConnect from "@/lib/mongodb";
import Exam from "../models/exam";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";

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
    const data = await request.json();

    const exam = await Exam.create({
      examType: data.examType,
      academicYearId: data.academicYearId,
      examDate: data.examDate,
      classId: data.classId,
      subjectId: data.subjectId,
      benchCapacity: data.benchCapacity,
    });

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error in POST /api/exam:", error);
    return NextResponse.json(
      { error: "Failed to create exam" },
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
    const clientOrganizationId = token.clientOrganizationId;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const examType = searchParams.get("examType");
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const examDate = searchParams.get("examDate");
    const result = searchParams.get("result");

    if (id) {
      const exam = await Exam.findById(id)
        .where({ isActive: true })
        .where({ clientOrganizationId })
        .select("-__v");

      if (!exam) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }

      return NextResponse.json(exam);
    } else if (examType && examDate && classId && subjectId && result) {
      const exams = await Exam.find({
        examType: examType,
        examDate: examDate,
        classId: classId,
        subjectId: subjectId,
      })
        .where({ isActive: true })
        .where({ clientOrganizationId })
        .select("-__v");

      return NextResponse.json(exams);
    } else if (examType && examDate && classId && result) {
      const exams = await Exam.find({
        examType: examType,
        examDate: examDate,
        classId: classId,
      })
        .where({ isActive: true })
        .where({ clientOrganizationId })
        .select("-__v");

      return NextResponse.json(exams);
    } else if (examType && examDate && result) {
      const exams = await Exam.find({ examType: examType, examDate: examDate })
        .where({ isActive: true })
        .where({ clientOrganizationId })
        .select("-__v");

      return NextResponse.json(exams);
    } else if (examType) {
      const exams = await Exam.find({ examType: examType })
        .populate("classId")
        .where({ isActive: true })
        .where({ clientOrganizationId })
        .select("-__v");

      return NextResponse.json(exams);
    } else if (classId) {
      const exams = await Exam.find({ classId: classId })
        .populate("subjectId")
        .where({ isActive: true })
        .where({ clientOrganizationId })
        .select("-__v");

      return NextResponse.json(exams);
    }
  } catch (error) {
    console.error("Error in GET /api/exam:", error);
    return NextResponse.json(
      { error: "Failed to fetch exams" },
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
    const status = searchParams.get("status");

    if (!id) {
      return NextResponse.json(
        { error: "Exam ID is required" },
        { status: 400 }
      );
    }

    const examExists = await Exam.findById(id).where({
      clientOrganizationId,
    });

    if (!examExists) {
      return NextResponse.json({ error: "Invalid exam" }, { status: 400 });
    }

    let updateData: any = {};
    if (status && id) {
      updateData.status = status;
    } else {
      const data = await request.json();

      updateData = {
        examType: data.examType,
        academicYearId: data.academicYearId,
        examDate: data.examDate,
        classId: data.classId,
        subjectId: data.subjectId,
        modifiedDate: new Date(),
      };
    }

    const exam = await Exam.findByIdAndUpdate(id, updateData, {
      new: true,
    }).where({ clientOrganizationId });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json(exam);
  } catch (error) {
    console.error("Error in PUT /api/exam:", error);
    return NextResponse.json(
      { error: "Failed to update exam" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await dbConnect();
  const token = await getTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const clientOrganizationId = token.clientOrganizationId;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const exam = await Exam.findByIdAndUpdate(id, { isActive: false }).where({
      clientOrganizationId,
    });
    if (exam) {
      return NextResponse.json(exam, { status: 201 });
    } else {
      return NextResponse.json(
        { message: "Exam not found to delete" },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json({ error: "No entry selected" }, { status: 500 });
  }
}
