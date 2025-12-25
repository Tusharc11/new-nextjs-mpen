import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import StudentFeePayment from "../models/studentFeePayment";
import StudentFee from "../models/studentFee";
import "@/app/api/models/user";
import "@/app/api/models/feesStructure";


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
    const studentFeeId = searchParams.get("studentFeeId");
    const studentId = searchParams.get("studentId");

    await dbConnect();

    let query: any = {
      isActive: true
    };

    if (studentFeeId) {
      query.studentFeeId = studentFeeId;
    }

    // For students, only show their own payments
    if (token.role === 'STUDENT') {
      // First get all student fees for this student
      const studentFees = await StudentFee.find({ 
        studentId: token.id,
        isActive: true 
      }).select('_id');
      
      const studentFeeIds = studentFees.map(fee => fee._id);
      query.studentFeeId = { $in: studentFeeIds };
    } else if (studentId) {
      // For admin/staff, filter by specific student if provided
      const studentFees = await StudentFee.find({ 
        studentId: studentId,
        isActive: true 
      }).select('_id');
      
      const studentFeeIds = studentFees.map(fee => fee._id);
      query.studentFeeId = { $in: studentFeeIds };
    }

    const payments = await StudentFeePayment.find(query)
      .populate({
        path: "studentFeeId",
        populate: [
          {
            path: "studentId",
            select: "firstName lastName email"
          },
          {
            path: "feesStructureId",
            select: "installment totalAmount dueDate"
          }
        ]
      })
      .sort({ paidOn: -1 });

    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch student fee payments", message: error },
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

    // Only admin/staff can record payments
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { studentFeeId, feesStructureId, amount, paidOn, mode } = body;

    if (!studentFeeId || !feesStructureId || !amount || !paidOn || !mode) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify student fee exists
    const studentFee = await StudentFee.findById(studentFeeId);
    if (!studentFee) {
      return NextResponse.json(
        { error: "Student fee record not found" },
        { status: 404 }
      );
    }

    const payment = new StudentFeePayment({
      studentFeeId,
      feesStructureId,
      amount,
      paidOn: new Date(paidOn),
      mode
    });

    await payment.save();

    const populatedPayment = await StudentFeePayment.findById(payment._id)
      .populate({
        path: "studentFeeId",
        populate: [
          {
            path: "studentId",
            select: "firstName lastName email"
          },
          {
            path: "feesStructureId",
            select: "installment totalAmount dueDate"
          }
        ]
      });

    return NextResponse.json(populatedPayment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create student fee payment" },
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

    // Only admin/staff can update payments
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, paidOn, mode } = body;

    if (amount && amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    await dbConnect();

    const updateData: any = { modifiedDate: new Date() };
    if (amount) updateData.amount = amount;
    if (paidOn) updateData.paidOn = new Date(paidOn);
    if (mode) updateData.mode = mode;

    const payment = await StudentFeePayment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate({
      path: "studentFeeId",
      populate: [
        {
          path: "studentId",
          select: "firstName lastName email"
        },
        {
          path: "feesStructureId",
          select: "installment totalAmount dueDate"
        }
      ]
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update student fee payment" },
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

    // Only admin can delete payments
    if (token.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const payment = await StudentFeePayment.findByIdAndDelete(id);

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Payment deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete student fee payment" },
      { status: 500 }
    );
  }
} 