import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import StudentBusFee from "../models/studentBusFee";
import StudentBusFeePayment from "../models/studentBusFeePayment";
import StudentClass from "../models/studentClass";
import mongoose from "mongoose";
import "@/app/api/models/user";
import "@/app/api/models/transport";
import "@/app/api/models/studentBus";
import "@/app/api/models/class";
import "@/app/api/models/section";
import "@/app/api/models/session";

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

const getStudentBusFeesFromStudentClass = async (
  request: NextRequest,
  token: UserJwtPayload,
  academicYearId: string | null
) => {
  try {
    await dbConnect();

    // Ensure academic year is provided
    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year ID is required for this query" },
        { status: 400 }
      );
    }

    // Build the exact aggregation pipeline from your query
    let pipeline: any[] = [
      {
        $match: {
          isActive: true,
          academicYear: new mongoose.Types.ObjectId(academicYearId),
          isBusTaken: true
        }
      },
      {
        $lookup: {
          from: "studentbuses",
          localField: "studentId",
          foreignField: "studentId",
          as: "studentBusDetails"
        }
      },
      {
        $unwind: "$studentBusDetails"
      },
      {
        $match: {
          "studentBusDetails.isActive": true,
          "studentBusDetails.academicYearId": new mongoose.Types.ObjectId(academicYearId)
        }
      },
      {
        $lookup: {
          from: "studentbusfees",
          localField: "studentBusDetails._id",
          foreignField: "studentBusId",
          as: "studentBusFeesDetails"
        }
      },
      {
        $lookup: {
          from: "classes",
          localField: "class",
          foreignField: "_id",
          as: "classDetails"
        }
      },
      {
        $unwind: {
          path: "$classDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "sections",
          localField: "section",
          foreignField: "_id",
          as: "sectionDetails"
        }
      },
      {
        $unwind: {
          path: "$sectionDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "transports",
          localField: "studentBusDetails.transportId",
          foreignField: "_id",
          as: "studentBusDetails.transportDetails"
        }
      },
      {
        $unwind: {
          path: "$studentBusDetails.transportDetails",
          preserveNullAndEmptyArrays: true
        }
      }
    ];

    // Add payment calculations for each bus fee
    pipeline.push({
      $addFields: {
        "studentBusFeesDetails": {
          $map: {
            input: "$studentBusFeesDetails",
            as: "busFee",
            in: {
              $mergeObjects: [
                "$$busFee",
                {
                  totalPaidFees: 0,
                  remainingAmount: "$$busFee.amount"
                }
              ]
            }
          }
        }
      }
    });

    // Lookup payments for each bus fee and calculate totals
    pipeline.push({
      $lookup: {
        from: "studentbusfeepayments",
        let: { busFeeIds: "$studentBusFeesDetails._id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$studentBusFeeId", "$$busFeeIds"] },
                  { $eq: ["$isActive", true] }
                ]
              }
            }
          }
        ],
        as: "allPayments"
      }
    });

    // Calculate payment totals for each bus fee
    pipeline.push({
      $addFields: {
        "studentBusFeesDetails": {
          $map: {
            input: "$studentBusFeesDetails",
            as: "busFee",
            in: {
              $let: {
                vars: {
                  feePayments: {
                    $filter: {
                      input: "$allPayments",
                      cond: { $eq: ["$$this.studentBusFeeId", "$$busFee._id"] }
                    }
                  }
                },
                in: {
                  $mergeObjects: [
                    "$$busFee",
                    {
                      totalPaidFees: { $sum: "$$feePayments.amount" },
                      remainingAmountFees: {
                        $subtract: [
                          "$$busFee.amount",
                          { $sum: "$$feePayments.amount" }
                        ]
                      },
                      payments: "$$feePayments"
                    }
                  ]
                }
              }
            }
          }
        }
      }
    });

    // Remove the temporary allPayments field
    pipeline.push({
      $project: {
        allPayments: 0
      }
    });

    // Add security filters based on role
    if (token.role === 'ADMIN' || token.role === 'STAFF') {
      // Add organization filter by adding user lookup and match
      pipeline.splice(1, 0, 
        {
          $lookup: {
            from: "users",
            localField: "studentId",
            foreignField: "_id",
            as: "student"
          }
        },
        {
          $unwind: "$student"
        },
        {
          $match: {
            "student.clientOrganizationId": new mongoose.Types.ObjectId(token.clientOrganizationId)
          }
        }
      );
    } else if (token.role === 'STUDENT') {
      // For students, only show their own data
      pipeline[0].$match.studentId = new mongoose.Types.ObjectId(token.id);
    } else {
      return NextResponse.json({ error: "Unauthorized role" }, { status: 403 });
    }

    // First, let's check if we have any studentclasses records
    const allStudentClasses = await StudentClass.find({ isActive: true }).limit(5);

    // Check if we have any studentclasses with isBusTaken: true
    const busStudents = await StudentClass.find({ 
      isActive: true, 
      isBusTaken: true,
      academicYear: new mongoose.Types.ObjectId(academicYearId)
    }).limit(5);

    const result = await StudentClass.aggregate(pipeline);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in getStudentBusFeesFromStudentClass:", error);
    return NextResponse.json(
      { error: "Failed to fetch student bus fees from student class", message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
};

export async function GET(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const useStudentClassAggregation = searchParams.get("useStudentClassAggregation");

    await dbConnect();

    // Use the new aggregation pipeline starting from studentclasses collection
    if (useStudentClassAggregation === "true") {
      return await getStudentBusFeesFromStudentClass(request, token, academicYearId);
    }

    let studentBusFeesQuery: any = {
      isActive: true
    };

    // For students, only show their own fees
    if (token.role === 'STUDENT') {
      studentBusFeesQuery.studentId = new mongoose.Types.ObjectId(token.id);
    }

    let studentBusFees;

    if (token.role === 'ADMIN' || token.role === 'STAFF') {
      // For admin/staff, get all students with their bus fees grouped by class/section
      let pipeline: any[] = [
        {
          $lookup: {
            from: "users",
            localField: "studentId",
            foreignField: "_id",
            as: "student"
          }
        },
        { $unwind: "$student" },
        {
          $lookup: {
            from: "studentclasses",
            localField: "studentId",
            foreignField: "studentId",
            as: "studentClass"
          }
        },
        { $unwind: "$studentClass" },
        {
          $lookup: {
            from: "studentbus",
            localField: "studentBusId",
            foreignField: "_id",
            as: "studentBus"
          }
        },
        { $unwind: "$studentBus" },
        {
          $lookup: {
            from: "transport",
            localField: "studentBus.transportId",
            foreignField: "_id",
            as: "transport"
          }
        },
        { $unwind: "$transport" },
        {
          $lookup: {
            from: "classes",
            localField: "studentClass.class",
            foreignField: "_id",
            as: "class"
          }
        },
        { $unwind: "$class" },
        {
          $lookup: {
            from: "sections",
            localField: "studentClass.section",
            foreignField: "_id",
            as: "section"
          }
        },
        { $unwind: "$section" },
        {
          $lookup: {
            from: "sessions",
            localField: "studentClass.academicYear",
            foreignField: "_id",
            as: "academicYear"
          }
        },
        { $unwind: "$academicYear" },
        {
          $lookup: {
            from: "studentbusfeepayments",
            localField: "_id",
            foreignField: "studentBusFeeId",
            as: "payments",
            let: { studentBusFeeId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$studentBusFeeId", "$$studentBusFeeId"] },
                      { $eq: ["$isActive", true] }
                    ]
                  }
                }
              }
            ]
          }
        },
        {
          $match: {
            "student.clientOrganizationId": { $eq: new mongoose.Types.ObjectId(token.clientOrganizationId) },
            isActive: true
          }
        }
      ];

      // Add filters if provided
      if (academicYearId) {
        pipeline.push({
          $match: {
            "studentClass.academicYear": { $eq: new mongoose.Types.ObjectId(academicYearId) }
          }
        });
      }

      if (classId) {
        pipeline.push({
          $match: {
            "studentClass.class": { $eq: new mongoose.Types.ObjectId(classId) }
          }
        });
      }

      if (sectionId) {
        pipeline.push({
          $match: {
            "studentClass.section": { $eq: new mongoose.Types.ObjectId(sectionId) }
          }
        });
      }

      pipeline.push({
        $addFields: {
          totalPaid: { $sum: "$payments.amount" },
          remainingAmount: { $subtract: ["$amount", { $sum: "$payments.amount" }] }
        }
      });

      pipeline.push({
        $sort: { "class.classNumber": 1, "section.section": 1, "student.firstName": 1, "dueDate": 1 }
      });

      studentBusFees = await StudentBusFee.aggregate(pipeline);
    } else {
      // For students, get their own bus fees with payments
      let pipeline: any[] = [
        {
          $match: {
            studentId: new mongoose.Types.ObjectId(token.id),
            isActive: true
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "studentId",
            foreignField: "_id",
            as: "student"
          }
        },
        { $unwind: "$student" },
        {
          $lookup: {
            from: "studentclasses",
            localField: "studentId",
            foreignField: "studentId",
            as: "studentClass"
          }
        },
        { $unwind: "$studentClass" },
        {
          $lookup: {
            from: "studentbus",
            localField: "studentBusId",
            foreignField: "_id",
            as: "studentBus"
          }
        },
        { $unwind: "$studentBus" },
        {
          $lookup: {
            from: "transport",
            localField: "studentBus.transportId",
            foreignField: "_id",
            as: "transport"
          }
        },
        { $unwind: "$transport" },
        {
          $lookup: {
            from: "classes",
            localField: "studentClass.class",
            foreignField: "_id",
            as: "class"
          }
        },
        { $unwind: "$class" },
        {
          $lookup: {
            from: "sections",
            localField: "studentClass.section",
            foreignField: "_id",
            as: "section"
          }
        },
        { $unwind: "$section" },
        {
          $lookup: {
            from: "sessions",
            localField: "studentClass.academicYear",
            foreignField: "_id",
            as: "academicYear"
          }
        },
        { $unwind: "$academicYear" },
        {
          $lookup: {
            from: "studentbusfeepayments",
            localField: "_id",
            foreignField: "studentBusFeeId",
            as: "payments",
            let: { studentBusFeeId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$studentBusFeeId", "$$studentBusFeeId"] },
                      { $eq: ["$isActive", true] }
                    ]
                  }
                }
              }
            ]
          }
        },
        {
          $addFields: {
            totalPaid: { $sum: "$payments.amount" },
            remainingAmount: { $subtract: ["$amount", { $sum: "$payments.amount" }] }
          }
        },
        {
          $sort: { dueDate: 1 }
        }
      ];

      if (academicYearId) {
        pipeline.splice(-1, 0, {
          $match: {
            "studentClass.academicYear": { $eq: new mongoose.Types.ObjectId(academicYearId) }
          }
        });
      }

      studentBusFees = await StudentBusFee.aggregate(pipeline);
    }

    return NextResponse.json(studentBusFees);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch student bus fees", message: error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin/staff can create student bus fee records
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, studentBusId, routeDestination, amount, dueDate } = body;

    if (!studentId || !studentBusId || !routeDestination || !amount || !dueDate) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Determine status based on due date
    const currentDate = new Date();
    const dueDateObj = new Date(dueDate);
    let status = 'not_started';
    
    if (dueDateObj <= currentDate) {
      status = 'pending';
    }
    
    if (dueDateObj < currentDate) {
      status = 'overdue';
    }

    const studentBusFee = new StudentBusFee({
      studentId,
      studentBusId,
      routeDestination,
      amount,
      dueDate: dueDateObj,
      status,
      isActive: true
    });

    await studentBusFee.save();

    // Populate the created fee before returning
    const populatedFee = await StudentBusFee.findById(studentBusFee._id)
      .populate("studentId", "firstName lastName email")
      .populate({
        path: "studentBusId",
        populate: {
          path: "transportId",
          select: "busNumber routeName"
        }
      });

    return NextResponse.json(populatedFee, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create student bus fee" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin/staff can update student bus fee records
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentBusFeeId, ...updateData } = body;

    if (!studentBusFeeId) {
      return NextResponse.json(
        { error: "Student bus fee ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Update the student bus fee
    const updatedFee = await StudentBusFee.findByIdAndUpdate(
      studentBusFeeId,
      { 
        ...updateData,
        modifiedDate: new Date()
      },
      { new: true }
    )
      .populate("studentId", "firstName lastName email")
      .populate({
        path: "studentBusId",
        populate: {
          path: "transportId",
          select: "busNumber routeName"
        }
      });

    if (!updatedFee) {
      return NextResponse.json(
        { error: "Student bus fee record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedFee);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update student bus fee" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admin/staff can delete student bus fee records
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentBusFeeId } = body;

    if (!studentBusFeeId) {
      return NextResponse.json(
        { error: "Student bus fee ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Mark student bus fee as inactive instead of deleting
    const updatedFee = await StudentBusFee.findByIdAndUpdate(
      studentBusFeeId,
      { 
        isActive: false,
        modifiedDate: new Date()
      },
      { new: true }
    );

    if (!updatedFee) {
      return NextResponse.json(
        { error: "Student bus fee record not found" },
        { status: 404 }
      );
    }

    // Also mark related payments as inactive
    await StudentBusFeePayment.updateMany(
      { studentBusFeeId },
      { 
        $set: { 
          isActive: false,
          modifiedDate: new Date()
        }
      }
    );

    return NextResponse.json({ message: "Student bus fee record deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete student bus fee" },
      { status: 500 }
    );
  }
}
