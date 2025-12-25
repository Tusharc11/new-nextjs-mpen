import dbConnect from "@/lib/mongodb";
import Subject from "../models/subject";
import { NextRequest, NextResponse } from "next/server";
import User from "@/app/api/models/user";
import { Course } from "../models/course";
import Session from "../models/session";
import { Section } from "../models/section";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { UserRole } from "@/lib/role";
import StudentClass from "../models/studentClass";
import "@/app/api/models/studentClass";

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
    const clientOrganizationId = token.clientOrganizationId;
    const data = await request.json();

    // Verify that class and section exist
    const courseExists = await Course.findById(data.courseId).where({
      clientOrganizationId,
    });
    const academicYearExists = await Session.findById(data.academicYearId);

    if (!courseExists || !academicYearExists) {
      return NextResponse.json(
        { error: "Invalid course or academic year" },
        { status: 400 }
      );
    }

    // Verify all staff IDs exist
    const staffIds = Array.isArray(data.staffIds)
      ? data.staffIds
      : [data.staffIds];
    const staffCount = await User.countDocuments({
      _id: { $in: staffIds },
    });

    if (staffCount !== staffIds.length) {
      return NextResponse.json(
        { error: "One or more staff members not found" },
        { status: 400 }
      );
    }

    const sectionIds = Array.isArray(data.sectionIds)
      ? data.sectionIds
      : [data.sectionIds];
    const sectionCount = await Section.countDocuments({
      _id: { $in: sectionIds },
    });

    if (sectionCount !== sectionIds.length) {
      return NextResponse.json(
        { error: "One or more sections not found" },
        { status: 400 }
      );
    }

    const subject = await Subject.create({
      subject: data.subject,
      courseId: data.courseId,
      staffIds: staffIds,
      academicYearId: data.academicYearId,
      sectionIds: sectionIds,
      clientOrganizationId: clientOrganizationId,
    });

    return NextResponse.json(subject);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create subject" },
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
    const sectionId = searchParams.get("sectionId");
    const studentId = searchParams.get("studentId");
    const role = searchParams.get("role");
    const staffId = searchParams.get("staffId");

    if (role === UserRole.STUDENT && studentId && academicYearId) {
      const studentClass = await StudentClass.findOne({
        studentId: studentId,
        isActive: true,
      });

      if (studentClass) {
        const courseList = await Course.find({
          class: studentClass.class._id,
          isActive: true,
          clientOrganizationId,
        });

        const subjects = await Subject.find({
          isActive: true,
          clientOrganizationId,
          academicYearId: academicYearId,
          sectionIds: { $in: studentClass.section._id },
          courseId: { $in: courseList.map((course) => course._id) },
        })
          .populate({
            path: "courseId",
            select: "_id class",
            populate: {
              path: "class",
              select: "_id classNumber",
            },
          })
          .populate("staffIds", "_id firstName lastName")
          .populate("sectionIds", "_id section")
          .select("-__v");

        return NextResponse.json(subjects);
      }
    }
    if (classId && sectionId) {
      // First, find all courses with the specified class ID
      const courses = await Course.find({
        class: classId,
        isActive: true,
        clientOrganizationId,
      });

      // Get the course IDs
      const courseIds = courses.map((course) => course._id);

      // Then find subjects that reference these courses and contain the section ID
      const subjects = await Subject.find({
        courseId: { $in: courseIds },
        sectionIds: { $in: [sectionId] },
        isActive: true,
        clientOrganizationId,
      })
        .populate("courseId")
        .populate("staffIds")
        .populate("academicYearId")
        .populate("sectionIds")
        .select("-__v");

      return NextResponse.json(subjects);
    } else if (id) {
      const subject = await Subject.findOne({
        _id: id,
        isActive: true,
        clientOrganizationId,
      })
        .populate("courseId")
        .populate("staffIds")
        .populate("academicYearId")
        .populate("sectionIds")
        .select("-__v");

      if (!subject) {
        return NextResponse.json(
          { error: "Subject not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(subject);
    } else if (academicYearId) {
      const subjects = await Subject.find({
        academicYearId: academicYearId,
        clientOrganizationId: clientOrganizationId,
        isActive: true,
      })
        .populate({
          path: "courseId",
          select: "_id class",
          populate: {
            path: "class",
            select: "_id classNumber",
          },
        })
        .populate("staffIds")
        .populate("academicYearId")
        .populate("sectionIds")
        .select("-__v");

      return NextResponse.json(subjects);
    } else if (classId) {
      // Find all courses with the specified class ID
      const courses = await Course.find({
        class: classId,
        isActive: true,
        clientOrganizationId,
      });

      if (courses.length === 0) {
        return NextResponse.json(
          { error: "No courses found for the specified class" },
          { status: 404 }
        );
      }

      // Get the course IDs
      const courseIds = courses.map((course) => course._id);

      // Find subjects that reference any of these courses
      const subjects = await Subject.find({
        courseId: { $in: courseIds },
        isActive: true,
        clientOrganizationId,
      })
        .populate("courseId")
        .populate("staffIds")
        .populate("academicYearId")
        .populate("sectionIds")
        .select("-__v");

      return NextResponse.json(subjects);
    } else if (staffId) {
      const subjects = await Subject.find({
        staffIds: { $in: [staffId] },
        isActive: true,
        clientOrganizationId,
      })
        .populate({
          path: "courseId",
          select: "_id class",
          populate: {
            path: "class",
            select: "_id classNumber"
          }
        })
        .populate("academicYearId")
        .populate("sectionIds", "_id section")
        .select("-__v");

      return NextResponse.json(subjects);
    } else {
      const subjects = await Subject.find({
        isActive: true,
        clientOrganizationId,
      })
        .populate("courseId")
        .populate("staffIds")
        .populate("academicYearId")
        .populate("sectionIds")
        .select("-__v");

      return NextResponse.json(subjects);
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
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
        { error: "Subject ID is required" },
        { status: 400 }
      );
    }

    // Find course by ID
    const courseExists = await Course.findById(data.courseId).where({
      clientOrganizationId,
    });
    const academicYearExists = await Session.findById(
      data.academicYearId
    ).where({
      clientOrganizationId,
    });

    if (!courseExists || !academicYearExists) {
      return NextResponse.json(
        { error: "Invalid course or academic year" },
        { status: 400 }
      );
    }

    // Verify all staff IDs exist
    const staffIds = Array.isArray(data.staffIds)
      ? data.staffIds
      : [data.staffIds];
    const staffCount = await User.countDocuments({
      _id: { $in: staffIds },
      clientOrganizationId,
    });

    if (staffCount !== staffIds.length) {
      return NextResponse.json(
        { error: "One or more staff members not found" },
        { status: 400 }
      );
    }

    const sectionIds = Array.isArray(data.sectionIds)
      ? data.sectionIds
      : [data.sectionIds];
    const sectionCount = await Section.countDocuments({
      _id: { $in: sectionIds },
      clientOrganizationId,
    });

    if (sectionCount !== sectionIds.length) {
      return NextResponse.json(
        { error: "One or more sections not found" },
        { status: 400 }
      );
    }

    const subject = await Subject.findByIdAndUpdate(
      id,
      {
        subject: data.subject,
        courseId: data.courseId,
        staffIds: staffIds,
        academicYearId: data.academicYearId,
        sectionIds: sectionIds,
        modifiedDate: new Date(),
      },
      { new: true }
    )
      .where({ clientOrganizationId })
      .populate("courseId")
      .populate("staffIds")
      .populate("academicYearId")
      .populate("sectionIds");

    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json(subject);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update subject" },
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
    const subject = await Subject.findByIdAndUpdate(id, {
      isActive: false,
    }).where({ clientOrganizationId });
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
