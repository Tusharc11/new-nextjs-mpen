import dbConnect from "@/lib/mongodb";
import StudentFeePayment from "../../models/studentFeePayment";
import StudentFee from "../../models/studentFee";
import FeesStructure from "../../models/feesStructure";
import StudentClass from "../../models/studentClass";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import { UserRole } from "@/lib/role";
import jwt from "jsonwebtoken";
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

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");
    const period = searchParams.get("period"); // day, month, quarterly, half-yearly, yearly
    const classFilter = searchParams.get("class");
    const sectionFilter = searchParams.get("section");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const modeFilter = searchParams.get("mode");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

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

    // Build date range based on period filter
    let dateFilter: any = {};
    const currentDate = new Date();
    
    if (period) {
      const startOfPeriod = new Date();
      const endOfPeriod = new Date();
      
      switch (period) {
        case 'day':
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startOfPeriod.setDate(1);
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setMonth(currentDate.getMonth() + 1, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
        case 'quarterly':
          const currentQuarter = Math.floor(currentDate.getMonth() / 3);
          startOfPeriod.setMonth(currentQuarter * 3, 1);
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setMonth((currentQuarter + 1) * 3, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
        case 'half-yearly':
          const currentHalf = Math.floor(currentDate.getMonth() / 6);
          startOfPeriod.setMonth(currentHalf * 6, 1);
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setMonth((currentHalf + 1) * 6, 0);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
        case 'yearly':
          startOfPeriod.setMonth(0, 1);
          startOfPeriod.setHours(0, 0, 0, 0);
          endOfPeriod.setMonth(11, 31);
          endOfPeriod.setHours(23, 59, 59, 999);
          break;
      }
      
      dateFilter.paidOn = {
        $gte: startOfPeriod,
        $lte: endOfPeriod
      };
    } else if (startDate && endDate) {
      dateFilter.paidOn = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      dateFilter.paidOn = { $gte: new Date(startDate) };
    }

    // Get all fee structures for the academic year and organization
    const feeStructures = await FeesStructure.find({
      academicYearId: academicYearId,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    });

    if (feeStructures.length === 0) {
      return NextResponse.json({
        payments: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalRecords: 0,
          hasMore: false
        },
        summary: {
          totalAmount: 0,
          totalPayments: 0,
          averagePayment: 0
        }
      });
    }

    const feeStructureIds = feeStructures.map(fs => fs._id);

    // Build class filter for student lookup
    let classFilterCondition: any = {};
    if (classFilter || sectionFilter) {
      // First get matching student classes
      const studentClassQuery: any = {
        academicYear: academicYearId,
        isActive: true
      };

      if (classFilter || sectionFilter) {
        const classMatch: any = {};
        if (classFilter) classMatch.classNumber = classFilter;
        
        const sectionMatch: any = {};
        if (sectionFilter) sectionMatch.section = sectionFilter;

        const studentClasses = await StudentClass.find(studentClassQuery)
          .populate({
            path: 'class',
            match: Object.keys(classMatch).length > 0 ? classMatch : undefined
          })
          .populate({
            path: 'section', 
            match: Object.keys(sectionMatch).length > 0 ? sectionMatch : undefined
          })
          .populate({
            path: 'studentId',
            match: {
              role: UserRole.STUDENT,
              clientOrganizationId: clientOrganizationId,
              isActive: true
            }
          });

        const filteredStudentIds = studentClasses
          .filter(sc => sc.studentId && sc.class && sc.section)
          .map(sc => sc.studentId._id);

        if (filteredStudentIds.length === 0) {
          return NextResponse.json({
            payments: [],
            pagination: {
              currentPage: page,
              totalPages: 0,
              totalRecords: 0,
              hasMore: false
            },
            summary: {
              totalAmount: 0,
              totalPayments: 0,
              averagePayment: 0
            }
          });
        }

        classFilterCondition.studentId = { $in: filteredStudentIds };
      }
    }

    // Main aggregation to get fee payments with student and class details
    const matchCondition = {
      feesStructureId: { $in: feeStructureIds },
      isActive: true,
      ...dateFilter,
      ...(modeFilter ? { mode: modeFilter } : {})
    };

    // Build the main aggregation pipeline that will be reused for both data and summary
    const baseAggregationPipeline = [
      {
        $match: matchCondition
      },
      {
        $lookup: {
          from: "studentfees",
          localField: "studentFeeId",
          foreignField: "_id",
          as: "studentFee"
        }
      },
      {
        $unwind: "$studentFee"
      },
      ...(Object.keys(classFilterCondition).length > 0 ? [{
        $match: {
          "studentFee.studentId": classFilterCondition.studentId
        }
      }] : []),
      {
        $lookup: {
          from: "users",
          localField: "studentFee.studentId",
          foreignField: "_id",
          as: "student"
        }
      },
      {
        $unwind: "$student"
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
        $unwind: "$feeStructure"
      }
    ];

    // Get total count with all filters applied
    const totalCountResult = await StudentFeePayment.aggregate([
      ...baseAggregationPipeline,
      {
        $count: "total"
      }
    ]);
    const totalCount = totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // Get paginated results
    const skip = (page - 1) * limit;
    const paymentsRaw = await StudentFeePayment.aggregate([
      ...baseAggregationPipeline,
      {
        $project: {
          _id: 1,
          amount: 1,
          paidOn: 1,
          mode: 1,
          studentId: "$student._id",
          studentName: {
            $concat: ["$student.firstName", " ", "$student.lastName"]
          },
          feeStructureName: "$feeStructure.name",
          feeType: "$feeStructure.feesType",
          rollNumber: "$student.rollNumber"
        }
      },
      {
        $sort: { paidOn: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: limit
      }
    ]);

    // Get student class information separately using populate (like the working code)
    const studentClassData = await StudentClass.find({
      academicYear: new mongoose.Types.ObjectId(academicYearId),
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

    // Debug logging
    console.log(`Found ${studentClassData.length} student class records for academic year ${academicYearId}`);
    console.log('Sample student class data:', JSON.stringify(studentClassData.slice(0, 2), null, 2));

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

    console.log(`Created map with ${studentToClassMap.size} student-to-class mappings`);
    console.log('Sample map entries:', Array.from(studentToClassMap.entries()).slice(0, 2));

    // Map the class information to payments
    const payments = paymentsRaw.map(payment => {
      const studentIdStr = payment.studentId.toString();
      const classInfo = studentToClassMap.get(studentIdStr);
      
      // Debug: Log for the first few payments
      if (paymentsRaw.indexOf(payment) < 2) {
        console.log(`Payment ${payment._id}: Student ID ${studentIdStr}, Class Info:`, classInfo);
      }
      
      return {
        ...payment,
        className: classInfo?.className || null,
        sectionName: classInfo?.sectionName || null
      };
    });

    // Calculate summary statistics with all filters applied
    const summaryStats = await StudentFeePayment.aggregate([
      ...baseAggregationPipeline,
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalPayments: { $sum: 1 },
          averagePayment: { $avg: "$amount" }
        }
      }
    ]);

    const summary = summaryStats.length > 0 ? {
      totalAmount: summaryStats[0].totalAmount,
      totalPayments: summaryStats[0].totalPayments,
      averagePayment: Math.round(summaryStats[0].averagePayment)
    } : {
      totalAmount: 0,
      totalPayments: 0,
      averagePayment: 0
    };

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords: totalCount,
        hasMore: page < totalPages
      },
      summary,
      academicYearId
    });

  } catch (error) {
    console.error("Error fetching fee payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee payments" },
      { status: 500 }
    );
  }
}
