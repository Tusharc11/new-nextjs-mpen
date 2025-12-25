import dbConnect from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Class } from "../models/class";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import Exam from "../models/exam";
import Session from "../models/session";
import Subject from "../models/subject";
import "@/app/api/models/examType";
import "@/app/api/models/subject";
import "@/app/api/models/user";
import SeatingArrangement from "../models/seatingArrangement";
import Room from "../models/rooms";
import StudentClass from "../models/studentClass";
import User from "../models/user";
import mongoose from "mongoose";
import "@/app/api/models/section";

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

// Add this function near your other utility functions
// this can be in mongo db and configurable based om exam type
// should be static
const getRoomSize = (classNumber: number) => {
  if (classNumber >= 1 && classNumber <= 2) {
    return ["XS"];
  } else if (classNumber >= 3 && classNumber <= 4) {
    return ["S"];
  } else if (classNumber >= 5 && classNumber <= 6) {
    return ["M"];
  } else if (classNumber >= 7 && classNumber <= 8) {
    return ["L"];
  } else if (classNumber >= 9 && classNumber <= 10) {
    return ["XL", "ALL"];
  } else if (classNumber >= 11 && classNumber <= 12) {
    return ["XXL", "ALL"];
  }
};

const getSharedClass = (classNumber: number) => {
  if (classNumber >= 1 && classNumber <= 2) {
    return [1, 2];
  }
  if (classNumber >= 3 && classNumber <= 4) {
    return [3, 4];
  }
  if (classNumber >= 5 && classNumber <= 6) {
    return [5, 6];
  }
  if (classNumber >= 7 && classNumber <= 8) {
    return [7, 8];
  }
  if (classNumber >= 9 && classNumber <= 10) {
    return [9, 10];
  }
  if (classNumber >= 11 && classNumber <= 12) {
    return [11, 12];
  }
  return []; // Default return to avoid undefined
};

// Method to calculate total room capacity
const calculateTotalRoomCapacity = async (
  classNumber: number,
  clientOrganizationId: string
) => {
  const roomSize = getRoomSize(classNumber);

  const totalRooms = await Room.find({
    studentRoomType: { $in: roomSize },
    isActive: true,
    clientOrganizationId,
  }).select("capacity _id layout");

  const totalBenches = totalRooms.reduce((totalSum, room) => {
    const roomCapacity = room.layout.reduce(
      (roomSum: number, layoutRow: { benches: number }) => {
        return roomSum + (layoutRow.benches || 0);
      },
      0
    );
    return totalSum + roomCapacity;
  }, 0);

  return { totalBenches };
};

// Method to get current class student count
const getCurrentClassStudentCount = async (
  classId: string,
  clientOrganizationId: string
) => {
  const studentClasses = await StudentClass.find({
    class: classId,
    isActive: true,
  }).populate({
    path: "studentId",
    match: {
      clientOrganizationId: clientOrganizationId,
      isActive: true,
    },
  });

  return studentClasses.filter((sc) => sc.studentId !== null).length;
};

// Method to get occupied capacity from other shared classes
const getOccupiedCapacityFromSharedClasses = async (
  currentClassNumber: number,
  examType: string,
  academicYearId: string,
  examDate: string,
  clientOrganizationId: string,
  benchCapacity: number
) => {
  const sharedClasses = getSharedClass(currentClassNumber);

  if (!sharedClasses) {
    return 0;
  }

  // Validate bench capacity based on number of classes sharing one room
  const maxClassesSharing = sharedClasses.length;
  if (benchCapacity > maxClassesSharing) {
    throw new Error(`Bench capacity cannot exceed ${maxClassesSharing} as only ${maxClassesSharing} classes can share this room. Please select a bench capacity of ${maxClassesSharing} or less.`);
  }

  const otherSharedClasses = sharedClasses.filter(
    (classNum) => classNum !== currentClassNumber
  );

  // First find the classes with the class numbers to get their ObjectIds
  const otherClasses = await Class.find({
    classNumber: { $in: otherSharedClasses },
    clientOrganizationId: clientOrganizationId,
    isActive: true
  }).select('_id');

  const otherClassIds = otherClasses.map(cls => cls._id);

  const sameBenchCapacity = await Exam.find({
    examType: examType,
    academicYearId: academicYearId,
    examDate: examDate,
    isActive: true,
    clientOrganizationId: clientOrganizationId,
    classId: { $in: otherClassIds }
  }).select("benchCapacity");

  if(sameBenchCapacity.length > 0 && benchCapacity !== sameBenchCapacity[0]?.benchCapacity) {
    throw new Error("Please select " + benchCapacity + " bench capacity for this exam");
  }

  // get all exams for other shared classes
  // get all students if exams are found
  // count students

  const occupiedCapacityResult = await Exam.aggregate([
    {
      $match: {
        examType: new mongoose.Types.ObjectId(examType),
        academicYearId: new mongoose.Types.ObjectId(academicYearId),
        examDate: new Date(examDate),
        isActive: true,
        clientOrganizationId: new mongoose.Types.ObjectId(clientOrganizationId),
      },
    },
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'classInfo',
      },
    },
    { $unwind: '$classInfo' },
    {
      $match: {
        'classInfo.classNumber': { $in: otherSharedClasses },
        'classInfo.clientOrganizationId': {
          $in: [new mongoose.Types.ObjectId(clientOrganizationId)],
        },
      },
    },
    {
      $lookup: {
        from: 'studentclasses',
        localField: 'classId',
        foreignField: 'class',
        as: 'studentClasses',
      },
    },
    { $unwind: '$studentClasses' },
    {
      $match: {
        'studentClasses.isActive': true,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'studentClasses.studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: '$student' },
    {
      $match: {
        'student.isActive': true,
        'student.clientOrganizationId': new mongoose.Types.ObjectId(clientOrganizationId),
      },
    },
    {
      $count: 'totalOccupiedCapacity',
    },
  ]);

  return occupiedCapacityResult[0]?.totalOccupiedCapacity || 0;

};

// Method to validate exam prerequisites
const validateExamPrerequisites = async (
  classId: string,
  clientOrganizationId: string
) => {
  const classExists = await Class.findById(classId).where({
    clientOrganizationId,
  });

  return {
    isValid: true,
    classInfo: classExists,
  };
};

// Method to check for existing exam conflicts
const checkExamConflicts = async (data: any, clientOrganizationId: string) => {
  const existingExam = await Exam.findOne({
    examType: data.examType,
    classId: data.classId,
    academicYearId: data.academicYearId,
    examDate: data.examDate,
    isActive: true,
    clientOrganizationId,
  });

  if (existingExam) {
    return {
      hasConflict: true,
      error:
        "An exam of this type is already scheduled for this date and class. Please choose a different date.",
    };
  }

  return { hasConflict: false };
};

const canScheduleClassesOnDay = async ({
  totalBenches,
  studentsPerBench,
  alreadyOccupiedSeats,
  totalStudents
}: {
  totalBenches: number;
  studentsPerBench: number;
  alreadyOccupiedSeats: number;
  totalStudents: number;
}): Promise<boolean> => {

  const totalCapacity = totalBenches * studentsPerBench;
  const totalNeeded = alreadyOccupiedSeats + totalStudents;

  return totalNeeded <= totalCapacity;
};

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;
    const data = await request.json();

    // Check for exam conflicts
    const conflictCheck = await checkExamConflicts(data, clientOrganizationId);
    if (conflictCheck.hasConflict) {
      return NextResponse.json({ error: conflictCheck.error }, { status: 409 });
    }    

    // Validate prerequisites
    const validation = await validateExamPrerequisites(
      data.classId,
      clientOrganizationId
    );

    // Get class information
    const currentClass = validation.classInfo;

    // Run capacity calculations in parallel
    const [roomCapacityData, totalStudents, totalOccupiedCapacity] =
      await Promise.all([
        calculateTotalRoomCapacity(
          currentClass.classNumber,
          clientOrganizationId
        ),
        getCurrentClassStudentCount(data.classId, clientOrganizationId),
        getOccupiedCapacityFromSharedClasses(
          currentClass.classNumber,
          data.examType,
          data.academicYearId,
          data.examDate,
          clientOrganizationId,
          data.benchCapacity
        ),
      ]);

    const { totalBenches } = roomCapacityData;

    const canSchedule = await canScheduleClassesOnDay({
      totalBenches,
      studentsPerBench: data.benchCapacity,
      alreadyOccupiedSeats: totalOccupiedCapacity,
      totalStudents
    });

    if (!canSchedule) {
      return NextResponse.json({ error: "Insufficient room capacity" }, { status: 400 }
      );
    }

    const exam = await Exam.create({
      examType: data.examType,
      examDate: data.examDate,
      classId: data.classId,
      subjectId: data.subjectId,
      academicYearId: data.academicYearId,
      benchCapacity: data.benchCapacity,
      clientOrganizationId,
    });

    // Return exam with capacity information for reference
    return NextResponse.json({
      ...exam.toObject(),
      capacityInfo: canSchedule,
    });
  } catch (error: any) {
    console.error("Error in POST /api/manage-exam:", error);
    return NextResponse.json(
      { error: error.message },
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
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const examType = searchParams.get("examType");
    const sectionId = searchParams.get("sectionId");

    if (id && academicYearId && classId && examType) {
      const exam = await Exam.findOne({
        _id: id,
        isActive: true,
        clientOrganizationId,
        academicYearId,
        classId,
        examType,
      })
        .populate("classId")
        .populate("subjectId")
        .populate("academicYearId")
        .populate("examType")
        .select("-__v");

      if (!exam) {
        return NextResponse.json({ error: "Exam not found" }, { status: 404 });
      }

      return NextResponse.json(exam);
    } else if (academicYearId && classId && examType) {
      const exams = await Exam.find({
        isActive: true,
        clientOrganizationId,
        academicYearId,
        classId,
        examType,
      })
        .populate("classId", "_id classNumber")
        .populate("subjectId", "_id subject")
        .populate("examType", "_id type")
        .select("-__v");

      return NextResponse.json(exams);
    } else if (academicYearId && classId && sectionId) {
      const exams = await Exam.find({
        isActive: true,
        clientOrganizationId,
        academicYearId,
        classId,
      })
        .populate("classId", "_id classNumber")
        .populate("subjectId", "_id subject")
        .populate("examType", "_id type")
        .select("-__v")
        .lean();

      await Promise.all(
        exams.map(async (exam) => {
          exam.seatingArrangement = await SeatingArrangement.find({
            examId: exam._id,
            isActive: true,
            sectionId,
          })
            .populate("sectionId")
            .lean();
        })
      );

      return NextResponse.json(exams);
    } else if (academicYearId) {
      const exams = await Exam.find({
        isActive: true,
        clientOrganizationId,
        academicYearId,
      })
        .populate("classId")
        .populate("subjectId", "_id subject")
        .populate("examType", "_id type")
        .select("-__v")
        .lean();

      await Promise.all(
        exams.map(async (exam) => {
          exam.seatingArrangement = await SeatingArrangement.find({
            examId: exam._id,
            isActive: true,
          })
            .populate("sectionId")
            .lean();
        })
      );

      return NextResponse.json(exams);
    }
  } catch (error) {
    console.error("Error in GET /api/manage-exam:", error);
    return NextResponse.json(
      { error: "Failed to fetch exams", message: error },
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
        { error: "Exam ID is required" },
        { status: 400 }
      );
    }

    // Find class by its ID
    const classExists = await Class.findById(data.classId).where({
      clientOrganizationId,
    });

    if (!classExists) {
      return NextResponse.json({ error: "Invalid class" }, { status: 400 });
    }

    const course = await Exam.findByIdAndUpdate(
      id,
      {
        examType: data.examType,
        class: data.classId, // Use the ObjectId directly
        modifiedDate: new Date(),
      },
      { new: true }
    )
      .where({ clientOrganizationId })
      .populate("class");

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json(course);
  } catch (error) {
    console.error("Error in PUT /api/manage-course:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
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
    const course = await Exam.findByIdAndUpdate(id, {
      isActive: false,
    }).where({ clientOrganizationId });
    if (course) {
      return NextResponse.json(course, { status: 201 });
    } else {
      return NextResponse.json(
        { message: "Course not found to delete" },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json({ error: "No entry selected" }, { status: 500 });
  }
}
