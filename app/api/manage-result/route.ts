import dbConnect from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import Result from "../models/result";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const data = await request.json();

    // Check if a result with the same criteria already exists
    const existingResult = await Result.findOne({
      examDate: data.examDate,
      classId: data.classId,
      sectionId: data.sectionId,
      subjectId: data.subjectId,
    });

    if (existingResult) {
      return NextResponse.json(
        {
          error:
            "A result for this exam date, class, section, and subject already exists",
        },
        { status: 409 }
      );
    }

    const result = {
      ...data,
      clientOrganizationId: token.clientOrganizationId,
    };

    // Create the result document with the proper structure
    const resultResponse = await Result.create(result);

    return NextResponse.json(resultResponse);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create result" },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const subjectId = searchParams.get("subjectId");

    if (id) {
      const result = await Result.findById(id)
        .where({ isActive: true })
        .select("-__v");

      if (!result) {
        return NextResponse.json(
          { error: "Result not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(result);
    } else if (studentId && classId && sectionId) {
      // Find results for a specific student in a class and section
      const results = await Result.find({
        classId: classId,
        sectionId: sectionId,
        isActive: true,
        clientOrganizationId: token.clientOrganizationId,
        "results.studentId": studentId,
      })
      .populate("examType")
      .select("-__v");

      const formattedResults = results.map((result) => {
        const studentResult = result.results.find(
          (r: any) => r.studentId.toString() === studentId
        );
        return {
          _id: result._id,
          examDate: result.examDate,
          subjectId: result.subjectId,
          totalMarks: result.totalMarks,
          passingMarks: result.passingMarks,
          studentMarks: studentResult?.marks || null,
          percentage: studentResult?.percentage || null,
          grade: studentResult?.grade || null,
          present: studentResult?.present || false,
          staffId: result.staffId,
          examType: result.examType,
        };
      });

      return NextResponse.json(formattedResults);
    } else if (classId && sectionId && subjectId) {
      // Find results for a specific subject in a class and section
      const results = await Result.find({
        classId: classId,
        sectionId: sectionId,
        isActive: true,
        subjectId: subjectId,
        clientOrganizationId: token.clientOrganizationId
      })
        .populate({
          path: "results.studentId",
          model: "users",
        })
        .populate("examType")
        .select("-__v");

      return NextResponse.json(results);
    }

    // If no specific query parameters are provided
    return NextResponse.json(
      { error: "Invalid query parameters" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch results" },
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
    const updateOne = searchParams.get("updateOne");
    // Parse the request body
    const body = await request.json();
    if (updateOne) {
      const { parentId, resultId, present, marks, remark } = body;

      if (!parentId || !resultId) {
        return NextResponse.json(
          { error: "Parent ID and Result ID are required" },
          { status: 400 }
        );
      }
      // First find the document to get totalMarks
      const document = await Result.findById(parentId);
      if (!document) {
        return NextResponse.json(
          { error: "Result document not found" },
          { status: 404 }
        );
      }

      // Now update with the pre-calculated percentage
      const updatedDocument = await Result.findOneAndUpdate(
        {
          _id: parentId,
          "results._id": resultId,
        },
        {
          $set: {
            "results.$.present": present,
            "results.$.marks": marks,
            "results.$.remark": remark,
          },
        },
        { new: true } // Return the updated document
      );
      return NextResponse.json(updatedDocument);
    }
    return NextResponse.json(
      { error: "Invalid parameter provided" },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update result" },
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

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const result = await Result.findByIdAndUpdate(id, {
      isActive: false,
    });
    if (result) {
      return NextResponse.json(result, { status: 201 });
    } else {
      return NextResponse.json(
        { message: "Result not found to delete" },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json({ error: "No entry selected" }, { status: 500 });
  }
}
