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
import "@/app/api/models/class";

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

    const currentDate = new Date();

    // Step 1: Get all active students from StudentClass for the academic year
    const activeStudents = await StudentClass.find({
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
      select: 'firstName lastName parentPhoneNumber'
    });

    // Filter out students that don't match our criteria
    const validStudents = activeStudents.filter(sc => sc.studentId && sc.class && sc.section);

    if (validStudents.length === 0) {
      return NextResponse.json({
        defaulters: [],
        totalDefaulters: 0,
        totalOutstandingAmount: 0,
        academicYearId
      });
    }

    // Step 2: Get all fee structures for the academic year and organization
    const feeStructures = await FeesStructure.find({
      academicYearId: academicYearId,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    });

    if (feeStructures.length === 0) {
      return NextResponse.json({
        defaulters: [],
        totalDefaulters: 0,
        totalOutstandingAmount: 0,
        academicYearId
      });
    }

    const feeStructureIds = feeStructures.map(fs => fs._id);
    const studentIds = validStudents.map(s => s.studentId._id);

    // Step 3: Get all student fees for these students and fee structures
    const studentFeesData = await StudentFee.aggregate([
      {
        $match: {
          studentId: { $in: studentIds },
          feesStructureId: { $in: feeStructureIds },
          isActive: true,
          dueDate: { $lt: currentDate } // Only past due dates
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
          from: "studentlatefees",
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
          },
          overdueDays: {
            $floor: {
              $divide: [
                { $subtract: [currentDate, "$dueDate"] },
                1000 * 60 * 60 * 24 // Convert milliseconds to days
              ]
            }
          }
        }
      },
      {
        $match: {
          outstandingAmount: { $gt: 0 } // Only include records with outstanding amounts
        }
      },
      {
        $project: {
          studentId: 1,
          dueDate: 1,
          outstandingAmount: 1,
          overdueDays: 1,
          feesStructureId: 1
        }
      }
    ]);

    // Step 4: Create student to class mapping
    const studentToClassMap = new Map();
    const studentToDetailsMap = new Map();
    
    validStudents.forEach(sc => {
      const studentId = sc.studentId._id.toString();
      studentToClassMap.set(studentId, {
        className: sc.class.classNumber,
        sectionName: sc.section.section
      });
      studentToDetailsMap.set(studentId, {
        firstName: sc.studentId.firstName,
        lastName: sc.studentId.lastName,
        parentPhone: sc.studentId.parentPhoneNumber || 'N/A'
      });
    });

    // Step 5: Group defaulter students by studentId to consolidate multiple overdue fees
    const studentDefaultersMap = new Map();
    let totalOutstanding = 0;

    studentFeesData.forEach(fee => {
      const studentId = fee.studentId.toString();
      const classInfo = studentToClassMap.get(studentId);
      const studentDetails = studentToDetailsMap.get(studentId);
      
      if (!classInfo || !studentDetails) return;

      if (!studentDefaultersMap.has(studentId)) {
        studentDefaultersMap.set(studentId, {
          studentId: fee.studentId,
          fullName: `${studentDetails.firstName} ${studentDetails.lastName}`,
          parentName: 'Parent', // You might want to add parent name field to User model
          parentPhone: studentDetails.parentPhone,
          className: classInfo.className,
          sectionName: classInfo.sectionName,
          classAndSection: `${classInfo.className} ${classInfo.sectionName}`,
          dueDates: [],
          totalOutstandingAmount: 0,
          maxOverdueDays: 0
        });
      }

      const studentData = studentDefaultersMap.get(studentId);
      studentData.dueDates.push({
        date: fee.dueDate,
        amount: fee.outstandingAmount,
        overdueDays: fee.overdueDays
      });
      studentData.totalOutstandingAmount += fee.outstandingAmount;
      studentData.maxOverdueDays = Math.max(studentData.maxOverdueDays, fee.overdueDays);
      
      totalOutstanding += fee.outstandingAmount;
    });

    // Step 6: Convert map to array and sort by outstanding amount (highest first)
    const defaultersArray = Array.from(studentDefaultersMap.values())
      .map(student => ({
        ...student,
        dueDates: student.dueDates.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        overdueDays: student.maxOverdueDays
      }))
      .sort((a, b) => b.totalOutstandingAmount - a.totalOutstandingAmount);

    return NextResponse.json({
      defaulters: defaultersArray,
      totalDefaulters: defaultersArray.length,
      totalOutstandingAmount: Math.round(totalOutstanding),
      academicYearId
    });

  } catch (error) {
    console.error("Error fetching defaulter students:", error);
    return NextResponse.json(
      { error: "Failed to fetch defaulter students" },
      { status: 500 }
    );
  }
}
