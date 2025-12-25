import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import StudentFee from "../models/studentFee";
import StudentFeePayment from "../models/studentFeePayment";
import mongoose from "mongoose";
import "@/app/api/models/feesStructure";
import "@/app/api/models/class";
import "@/app/api/models/section";
import "@/app/api/models/feesType";
import "@/app/api/models/discountType";
import "@/app/api/models/session";
import "@/app/api/models/user";
import StudentLateFee from "../models/studentLateFee";

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
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");

    await dbConnect();

    let studentFeesQuery: any = {
      isActive: true
    };

    // For students, only show their own fees
    if (token.role === 'STUDENT') {
      studentFeesQuery.studentId = new mongoose.Types.ObjectId(token.id);
    }

    let studentFees;

    if (token.role === 'ADMIN' || token.role === 'STAFF') {
      // For admin/staff, get all students with their fees grouped by class/section
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
            from: "feesstructures",
            localField: "feesStructureId",
            foreignField: "_id",
            as: "feesStructure"
          }
        },
        { $unwind: "$feesStructure" },
        {
          $lookup: {
            from: "feestypes",
            localField: "feesStructure.feesTypes.feesTypeId",
            foreignField: "_id",
            as: "feesTypeDetails"
          }
        },
        {
          $addFields: {
            "feesStructure.feesTypes": {
              $map: {
                input: "$feesStructure.feesTypes",
                as: "feeType",
                in: {
                  $mergeObjects: [
                    "$$feeType",
                    {
                      feesTypeId: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$feesTypeDetails",
                              cond: { $eq: ["$$this._id", "$$feeType.feesTypeId"] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $unset: "feesTypeDetails"
        },
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
            from: "discounttypes",
            localField: "discountTypeId",
            foreignField: "_id",
            as: "discount"
          }
        },
        {
          $lookup: {
            from: "studentfeepayments",
            localField: "_id",
            foreignField: "studentFeeId",
            as: "payments",
            let: { studentFeeId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$studentFeeId", "$$studentFeeId"] },
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
            "feesStructure.academicYearId": { $eq: new mongoose.Types.ObjectId(academicYearId) }
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
          isBusTaken: "$studentClass.isBusTaken",
          feeTotalAmount: {
            $cond: {
              if: { $gt: [{ $size: "$discount" }, 0] },
              then: {
                $cond: {
                  if: { $eq: [{ $arrayElemAt: ["$discount.type", 0] }, "PERCENTAGE"] },
                  then: {
                    $subtract: [
                      "$feesStructure.totalAmount",
                      {
                        $multiply: [
                          "$feesStructure.totalAmount",
                          { $divide: [{ $arrayElemAt: ["$discount.value", 0] }, 100] }
                        ]
                      }
                    ]
                  },
                  else: {
                    $subtract: [
                      "$feesStructure.totalAmount",
                      { $arrayElemAt: ["$discount.value", 0] }
                    ]
                  }
                }
              },
              else: "$feesStructure.totalAmount"
            }
          }
        }
      });

      pipeline.push({
        $addFields: {
          remainingAmount: { $subtract: ["$feeTotalAmount", "$totalPaid"] }
        }
      });

      pipeline.push({
        $sort: { "class.classNumber": 1, "section.section": 1, "student.firstName": 1, "dueDate": 1 }
      });

      studentFees = await StudentFee.aggregate(pipeline);
    } else {
      // For students, get their own fees with payments
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
            from: "feesstructures",
            localField: "feesStructureId",
            foreignField: "_id",
            as: "feesStructure"
          }
        },
        { $unwind: "$feesStructure" },
        {
          $lookup: {
            from: "feestypes",
            localField: "feesStructure.feesTypes.feesTypeId",
            foreignField: "_id",
            as: "feesTypeDetails"
          }
        },
        {
          $addFields: {
            "feesStructure.feesTypes": {
              $map: {
                input: "$feesStructure.feesTypes",
                as: "feeType",
                in: {
                  $mergeObjects: [
                    "$$feeType",
                    {
                      feesTypeId: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$feesTypeDetails",
                              cond: { $eq: ["$$this._id", "$$feeType.feesTypeId"] }
                            }
                          },
                          0
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        },
        {
          $unset: "feesTypeDetails"
        },
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
            from: "discounttypes",
            localField: "discountTypeId",
            foreignField: "_id",
            as: "discount"
          }
        },
        {
          $lookup: {
            from: "studentfeepayments",
            localField: "_id",
            foreignField: "studentFeeId",
            as: "payments",
            let: { studentFeeId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$studentFeeId", "$$studentFeeId"] },
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
            isBusTaken: "$studentClass.isBusTaken",
            feeTotalAmount: {
              $cond: {
                if: { $gt: [{ $size: "$discount" }, 0] },
                then: {
                  $cond: {
                    if: { $eq: [{ $arrayElemAt: ["$discount.type", 0] }, "PERCENTAGE"] },
                    then: {
                      $subtract: [
                        "$feesStructure.totalAmount",
                        {
                          $multiply: [
                            "$feesStructure.totalAmount",
                            { $divide: [{ $arrayElemAt: ["$discount.value", 0] }, 100] }
                          ]
                        }
                      ]
                    },
                    else: {
                      $subtract: [
                        "$feesStructure.totalAmount",
                        { $arrayElemAt: ["$discount.value", 0] }
                      ]
                    }
                  }
                },
                else: "$feesStructure.totalAmount"
              }
            }
          }
        },
        {
          $addFields: {
            remainingAmount: { $subtract: ["$feeTotalAmount", "$totalPaid"] }
          }
        },
        {
          $sort: { dueDate: 1 }
        }
      ];

      if (academicYearId) {
        pipeline.splice(-1, 0, {
          $match: {
            "feesStructure.academicYearId": { $eq: new mongoose.Types.ObjectId(academicYearId) }
          }
        });
      }

      studentFees = await StudentFee.aggregate(pipeline);
    }

    return NextResponse.json(studentFees);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch student fees", message: error },
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

    // Only admin/staff can create student fee records
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentId, feesStructureId, discountTypeId } = body;

    if (!studentId || !feesStructureId) {
      return NextResponse.json(
        { error: "Student ID and Fees Structure ID are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the fee structure details
    const FeesStructure = mongoose.model('feesStructure');
    const feesStructure = await FeesStructure.findById(feesStructureId);
    
    if (!feesStructure) {
      return NextResponse.json(
        { error: "Fees structure not found" },
        { status: 404 }
      );
    }

    // Check if student fees already exist for this structure
    const existingFees = await StudentFee.find({
      studentId,
      feesStructureId,
      isActive: true
    });

    if (existingFees.length > 0) {
      return NextResponse.json(
        { error: "Student fee records already exist for this fee structure" },
        { status: 400 }
      );
    }

    // Determine number of fee entries based on installment
    const installmentCounts: { [key: string]: number } = {
      '1': 1,
      '2': 2,
      '3': 3,
      '4': 4,
      '5': 5,
      '6': 6,
      '7': 7,
      '8': 8,
      '9': 9,
      '10': 10,
      '11': 11,
      '12': 12
    };

    const numberOfEntries = installmentCounts[feesStructure.installment];
    const createdFees: any[] = [];
    const currentDate = new Date();

    // Create fee entries based on payment installment
    for (let i = 0; i < numberOfEntries; i++) {
      const dueDate = new Date(feesStructure.dueDates[i]);
      
      // Determine status based on due date
      let status = 'not_started';
      
      // If due date has arrived, mark as pending
      if (dueDate <= currentDate) {
        status = 'pending';
      }
      
      // If already past due date, mark as overdue
      if (dueDate < currentDate) {
        status = 'overdue';
      }

      const studentFee = new StudentFee({
        studentId,
        feesStructureId,
        discountTypeId: discountTypeId || undefined,
        dueDate,
        status,
        isActive: true
      });

      await studentFee.save();
      createdFees.push(studentFee);
    }

    // Populate all created fees before returning
    const populatedFees = await StudentFee.find({
      _id: { $in: createdFees.map(f => f._id) }
    })
      .populate("studentId", "firstName lastName email")
      .populate({
        path: "feesStructureId",
        populate: [
          { path: "classId", select: "classNumber" },
          { path: "academicYearId", select: "startDate endDate" },
          { path: "feesTypes.feesTypeId", select: "name" }
        ]
      })
      .populate("discountTypeId")
      .sort({ dueDate: 1 });

    return NextResponse.json(populatedFees, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create student fee" },
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

    // Only admin/staff can update student fee records
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentFeeId, status } = body;

    if (!studentFeeId || !status) {
      return NextResponse.json(
        { error: "Student fee ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ['not_started', 'pending', 'overdue', 'paid'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Update the student fee status
    const updatedFee = await StudentFee.findByIdAndUpdate(
      studentFeeId,
      { 
        status,
        modifiedDate: new Date()
      },
      { new: true }
    ).populate("studentId", "firstName lastName email")
      .populate({
        path: "feesStructureId",
        populate: [
          { path: "classId", select: "classNumber" },
          { path: "academicYearId", select: "startDate endDate" },
          { path: "feesTypes.feesTypeId", select: "name amount" }
        ]
      })
      .populate("discountTypeId");

    if (!updatedFee) {
      return NextResponse.json(
        { error: "Student fee record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedFee);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update student fee" },
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

    // Only admin/staff can delete student fee records
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentFeeId } = body;

    if (!studentFeeId) {
      return NextResponse.json(
        { error: "Student fee ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Mark student fee as inactive instead of deleting
    const updatedFee = await StudentFee.findByIdAndUpdate(
      studentFeeId,
      { 
        isActive: false,
        modifiedDate: new Date()
      },
      { new: true }
    );

    if (!updatedFee) {
      return NextResponse.json(
        { error: "Student fee record not found" },
        { status: 404 }
      );
    }

    // Also mark related payments as inactive
    await StudentFeePayment.updateMany(
      { studentFeeId },
      { 
        $set: { 
          isActive: false,
          modifiedDate: new Date()
        }
      }
    );

    return NextResponse.json({ message: "Student fee record deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete student fee" },
      { status: 500 }
    );
  }
} 