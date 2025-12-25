import dbConnect from "@/lib/mongodb";
import StudentFee from "../../models/studentFee";
import StudentFeePayment from "../../models/studentFeePayment";
import FeesStructure from "../../models/feesStructure";
import StudentClass from "../../models/studentClass";
import StudentLateFee from "../../models/studentLateFee";
  import User from "../../models/user";
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

    // Get all fee structures for the academic year and organization
    const feeStructures = await FeesStructure.find({
      academicYearId: academicYearId,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    })
    .populate('classId', 'classNumber')
    .populate('sectionId', 'section');

    if (feeStructures.length === 0) {
      return NextResponse.json({
        totalOutstanding: 0,
        classWiseOutstanding: [],
        statusBreakdown: {
          pending: 0,
          overdue: 0,
          partiallyPaid: 0
        },
        studentCount: {
          totalStudents: 0,
          studentsWithOutstanding: 0
        },
        academicYearId
      });
    }

    const feeStructureIds = feeStructures.map(fs => fs._id);

    // Get all student fees for these fee structures with detailed information
    const studentFeesWithPayments = await StudentFee.aggregate([
      {
        $match: {
          feesStructureId: { $in: feeStructureIds },
          isActive: true,
          status: { $ne: 'paid' } // Only include records that are not marked as paid
        }
      },
      {
        $lookup: {
          from: "studentfeepayments",
          localField: "_id",
          foreignField: "studentFeeId",
          as: "payments"
        }
      },
      {
        $lookup: {
          from: "feesstructures",
          localField: "feesStructureId",
          foreignField: "_id",
          as: "feeStructure"
        }
      },
      {
        $lookup: {
          from: "studentlatefees", // Correct collection name for late fees
          let: { studentFeeId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$studentFeeId", "$$studentFeeId"]
                }
              }
            }
          ],
          as: "lateFees"
        }
      },
      {
        $addFields: {
          totalPaid: {
            $sum: {
              $map: {
                input: { $filter: { input: "$payments", cond: { $eq: ["$$this.isActive", true] } } },
                as: "payment",
                in: "$$payment.amount"
              }
            }
          },
          totalLateFees: {
            $sum: {
              $map: {
                input: { $filter: { input: "$lateFees", cond: { $ne: ["$$this.isWaived", true] } } },
                as: "lateFee",
                in: "$$lateFee.lateFeeAmount"
              }
            }
          },
          feeAmount: { $arrayElemAt: ["$feeStructure.totalAmount", 0] }
        }
      },
      {
        $addFields: {
          totalOwed: { $add: ["$feeAmount", "$totalLateFees"] },
          outstandingAmount: {
            $subtract: [
              { $add: ["$feeAmount", "$totalLateFees"] },
              "$totalPaid"
            ]
          }
        }
      }
    ]);

    // Get student class information for grouping - only for actual students
    const studentClassData = await StudentClass.find({
      academicYear: academicYearId,
      isActive: true
    })
    .populate('class', 'classNumber')
    .populate('section', 'section')
    .populate({
      path: 'studentId',
      match: { 
        role: UserRole.STUDENT,
        clientOrganizationId: clientOrganizationId,
        isActive: true
      },
      select: '_id firstName lastName'
    });

    // Create a map of student to class information
    const studentToClassMap = new Map();
    studentClassData.forEach(sc => {
      if (sc.studentId && sc.class && sc.section) {
        studentToClassMap.set(
          sc.studentId._id.toString(), 
          {
            className: sc.class.classNumber,
            sectionName: sc.section.section,
            classId: sc.class._id,
            sectionId: sc.section._id
          }
        );
      }
    });

    // First, get the actual student count per class (total students, not just those with outstanding fees)
    const classWiseStudentCounts = new Map();
    studentClassData.forEach(sc => {
      if (sc.studentId && sc.class && sc.section) {
        const classKey = `${sc.class.classNumber}-${sc.section.section}`;
        if (!classWiseStudentCounts.has(classKey)) {
          classWiseStudentCounts.set(classKey, {
            className: sc.class.classNumber,
            sectionName: sc.section.section,
            classId: sc.class._id,
            sectionId: sc.section._id,
            totalStudents: 0
          });
        }
        classWiseStudentCounts.get(classKey).totalStudents += 1;
      }
    });

    // Calculate total outstanding from ALL student fees (same as fee-stats API)
    let totalOutstanding = 0;
    studentFeesWithPayments.forEach(fee => {
      totalOutstanding += fee.outstandingAmount || 0;
    });

    // Process the results and group by class - count UNIQUE students, not fee records
    const classWiseOutstanding = new Map();
    const uniqueStudentsWithOutstanding = new Set();
    const classWiseUniqueStudents = new Map(); // Track unique students per class
    let statusBreakdown = {
      pending: 0,
      overdue: 0,
      partiallyPaid: 0
    };

    studentFeesWithPayments.forEach(fee => {
      const studentId = fee.studentId?.toString();
      const classInfo = studentToClassMap.get(studentId);
      
      // Track all students with outstanding for stats (regardless of class info)
      if (studentId) {
        uniqueStudentsWithOutstanding.add(studentId);
      }

      // Determine status for all fees (regardless of class info)
      if (fee.totalPaid > 0) {
        statusBreakdown.partiallyPaid += 1;
      } else if (fee.status === 'overdue') {
        statusBreakdown.overdue += 1;
      } else {
        statusBreakdown.pending += 1;
      }
      
      // Only process class-wise data if student has class info
      if (classInfo && studentId) {
        const classKey = `${classInfo.className}-${classInfo.sectionName}`;
        
        // Initialize class data if not exists
        if (!classWiseOutstanding.has(classKey)) {
          const totalStudentsInClass = classWiseStudentCounts.get(classKey)?.totalStudents || 0;
          classWiseOutstanding.set(classKey, {
            className: classInfo.className,
            sectionName: classInfo.sectionName,
            outstandingAmount: 0,
            studentsWithOutstanding: 0,
            totalStudentsInClass: totalStudentsInClass,
            averageOutstanding: 0
          });
          classWiseUniqueStudents.set(classKey, new Set());
        }

        const classData = classWiseOutstanding.get(classKey);
        const classStudentSet = classWiseUniqueStudents.get(classKey);

        // Add to class totals
        classData.outstandingAmount += fee.outstandingAmount;
        classStudentSet.add(studentId);
      }
    });

    // Update student counts with unique values
    classWiseOutstanding.forEach((classData, classKey) => {
      const uniqueStudentsInClass = classWiseUniqueStudents.get(classKey).size;
      classData.studentsWithOutstanding = uniqueStudentsInClass;
      classData.averageOutstanding = uniqueStudentsInClass > 0 
        ? classData.outstandingAmount / uniqueStudentsInClass 
        : 0;
    });

    // Add classes that have no outstanding fees but have students
    classWiseStudentCounts.forEach((classInfo, classKey) => {
      if (!classWiseOutstanding.has(classKey)) {
        classWiseOutstanding.set(classKey, {
          className: classInfo.className,
          sectionName: classInfo.sectionName,
          outstandingAmount: 0,
          studentsWithOutstanding: 0,
          totalStudentsInClass: classInfo.totalStudents,
          averageOutstanding: 0
        });
      }
    });

    // Convert map to array and sort by class number
    const classWiseArray = Array.from(classWiseOutstanding.values())
      .sort((a, b) => {
        const classA = parseInt(a.className) || 0;
        const classB = parseInt(b.className) || 0;
        if (classA !== classB) {
          return classA - classB; // Sort by class number ascending
        }
        // If same class number, sort by section name
        return a.sectionName.localeCompare(b.sectionName);
      });

    // Get actual total student count using proper role, clientOrganizationId, and active filtering
    const totalStudentClasses = await StudentClass.find({
      academicYear: academicYearId,
      isActive: true,
    })
      .populate({
        path: "studentId",
        match: { 
          role: UserRole.STUDENT,
          clientOrganizationId: clientOrganizationId,
          isActive: true
        },
        select: "_id"
      })
      .exec();

    // Filter out null students (those not matching our criteria) and count unique students
    const validStudentClasses = totalStudentClasses.filter(sc => sc.studentId);
    const totalUniqueStudents = validStudentClasses.length;

    // Get unique students with outstanding fees (already calculated above)
    const uniqueStudentsWithOutstandingCount = uniqueStudentsWithOutstanding.size;

    return NextResponse.json({
      totalOutstanding: Math.round(totalOutstanding),
      classWiseOutstanding: classWiseArray,
      statusBreakdown,
      studentCount: {
        totalStudents: totalUniqueStudents,
        studentsWithOutstanding: uniqueStudentsWithOutstandingCount
      },
      summary: {
        averageOutstandingPerStudent: uniqueStudentsWithOutstandingCount > 0 
          ? Math.round(totalOutstanding / uniqueStudentsWithOutstandingCount) 
          : 0,
        highestOutstandingClass: classWiseArray.length > 0 ? classWiseArray[0] : null,
        totalClasses: classWiseArray.length
      },
      academicYearId
    });

  } catch (error) {
    console.error("Error fetching outstanding fees:", error);
    return NextResponse.json(
      { error: "Failed to fetch outstanding fees" },
      { status: 500 }
    );
  }
}
