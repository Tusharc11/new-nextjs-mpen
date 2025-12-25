import dbConnect from "@/lib/mongodb";
import StudentClass from "../../models/studentClass";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import { UserRole } from "@/lib/role";
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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");

    // Get token for client organization
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientOrganizationId = token.clientOrganizationId;

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year ID is required" },
        { status: 400 }
      );
    }

    // Get all student classes for the academic year and organization - filtered by role
    const studentClasses = await StudentClass.find({
      academicYear: academicYearId,
      isActive: true,
    })
      .populate({
        path: "studentId",
        match: { 
          role: UserRole.STUDENT,
          clientOrganizationId: clientOrganizationId 
        },
        select: "isActive firstName lastName"
      })
      .populate("class", "classNumber")
      .populate("section", "section")
      .exec();

    // Filter out null students (those not matching our criteria)
    const validStudentClasses = studentClasses.filter(sc => sc.studentId);

    const totalStudents = validStudentClasses.length;
    const activeStudents = validStudentClasses.filter(
      (sc: any) => sc.studentId.isActive !== false
    ).length;

    // Group by class and section for detailed breakdown
    const classWiseBreakdown = new Map();
    
    validStudentClasses.forEach((sc: any) => {
      if (sc.class && sc.section) {
        const classKey = `${sc.class.classNumber}-${sc.section.section}`;
        
        if (!classWiseBreakdown.has(classKey)) {
          classWiseBreakdown.set(classKey, {
            className: sc.class.classNumber,
            sectionName: sc.section.section,
            classId: sc.class._id,
            sectionId: sc.section._id,
            totalStudents: 0,
            activeStudents: 0,
            inactiveStudents: 0,
            students: []
          });
        }
        
        const classData = classWiseBreakdown.get(classKey);
        classData.totalStudents += 1;
        
        const isActive = sc.studentId.isActive !== false;
        if (isActive) {
          classData.activeStudents += 1;
        } else {
          classData.inactiveStudents += 1;
        }
        
        classData.students.push({
          id: sc.studentId._id,
          firstName: sc.studentId.firstName,
          lastName: sc.studentId.lastName,
          isActive: isActive
        });
      }
    });

    // Convert map to array and sort by class name then section
    const classWiseArray = Array.from(classWiseBreakdown.values())
      .sort((a, b) => {
        // Convert to strings for comparison, then handle numeric vs alphabetic sorting
        const classA = String(a.className);
        const classB = String(b.className);
        
        if (classA !== classB) {
          // If both are numbers, sort numerically
          const numA = parseInt(classA);
          const numB = parseInt(classB);
          
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          
          // Otherwise sort alphabetically
          return classA.localeCompare(classB);
        }
        
        // If class names are the same, sort by section name
        return String(a.sectionName).localeCompare(String(b.sectionName));
      });

    return NextResponse.json({
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      classWiseBreakdown: classWiseArray,
      academicYearId
    });

  } catch (error) {
    console.error("Error fetching student statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch student statistics" },
      { status: 500 }
    );
  }
}
