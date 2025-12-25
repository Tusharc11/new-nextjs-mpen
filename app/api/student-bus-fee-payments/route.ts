import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
import StudentBusFeePayment from "../models/studentBusFeePayment";
import StudentBusFee from "../models/studentBusFee";
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
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentBusFeeId = searchParams.get("studentBusFeeId");

    await dbConnect();

    let query: any = { isActive: true };
    
    if (studentBusFeeId) {
      query.studentBusFeeId = studentBusFeeId;
    }

    const payments = await StudentBusFeePayment.find(query)
      .populate({
        path: "studentBusFeeId",
        populate: [
          { path: "studentId", select: "firstName lastName email" },
          { 
            path: "studentBusId",
            populate: {
              path: "transportId",
              select: "busNumber routeName"
            }
          }
        ]
      })
      .sort({ paidOn: -1 });

    return NextResponse.json(payments);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch student bus fee payments" },
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
    const { studentBusFeeId, amount, paidOn, mode } = body;

    if (!studentBusFeeId || !amount || !paidOn || !mode) {
      return NextResponse.json(
        { error: "All payment details are required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Verify the student bus fee exists
    const studentBusFee = await StudentBusFee.findById(new mongoose.Types.ObjectId(studentBusFeeId));
    if (!studentBusFee) {
      return NextResponse.json(
        { error: "Student bus fee record not found" },
        { status: 404 }
      );
    }

    // Check if the payment amount doesn't exceed the remaining amount
    const existingPayments = await StudentBusFeePayment.find({
      studentBusFeeId,
      isActive: true
    });
    
    const totalPaid = existingPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingAmount = studentBusFee.amount - totalPaid;

    if (amount > remainingAmount) {
      return NextResponse.json(
        { error: `Payment amount (${amount}) exceeds remaining amount (${remainingAmount})` },
        { status: 400 }
      );
    }

    // Create the payment record
    const payment = new StudentBusFeePayment({
      studentBusFeeId,
      amount,
      paidOn: new Date(paidOn),
      mode,
      isActive: true
    });

    await payment.save();

    // Update student bus fee status based on payment
    const newTotalPaid = totalPaid + amount;
    let newStatus = studentBusFee.status;

    if (newTotalPaid >= studentBusFee.amount) {
      newStatus = 'paid';
    } else if (newTotalPaid > 0) {
      newStatus = 'pending';
    }

    await StudentBusFee.findByIdAndUpdate(new mongoose.Types.ObjectId(studentBusFeeId), {
      status: newStatus,
      modifiedDate: new Date()
    });

    // Populate the payment before returning
    

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to record payment" },
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
    const paymentId = searchParams.get("id");

    if (!paymentId) {
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

    const updatedPayment = await StudentBusFeePayment.findByIdAndUpdate(
      new mongoose.Types.ObjectId(paymentId),
      updateData,
      { new: true }
    ).populate({
      path: "studentBusFeeId",
      populate: [
        { path: "studentId", select: "firstName lastName email" },
        { 
          path: "studentBusId",
          populate: {
            path: "transportId",
            select: "busNumber routeName"
          }
        }
      ]
    });

    if (!updatedPayment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedPayment);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update payment" },
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

    // Only admin/staff can delete payments
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("id");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get the payment to recalculate status
    const payment = await StudentBusFeePayment.findById(new mongoose.Types.ObjectId(paymentId));
    if (!payment) {
      return NextResponse.json(
        { error: "Payment record not found" },
        { status: 404 }
      );
    }

    // Mark payment as inactive
    await StudentBusFeePayment.findByIdAndUpdate(new mongoose.Types.ObjectId(paymentId), {
      isActive: false,
      modifiedDate: new Date()
    });

    // Recalculate student bus fee status
    const studentBusFee = await StudentBusFee.findById(new mongoose.Types.ObjectId(payment.studentBusFeeId));
    if (studentBusFee) {
      const remainingPayments = await StudentBusFeePayment.find({
        studentBusFeeId: payment.studentBusFeeId,
        isActive: true
      });
      
      const totalPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
      let newStatus = 'not_started';
      
      if (totalPaid >= studentBusFee.amount) {
        newStatus = 'paid';
      } else if (totalPaid > 0) {
        newStatus = 'pending';
      } else {
        const currentDate = new Date();
        if (studentBusFee.dueDate < currentDate) {
          newStatus = 'overdue';
        } else if (studentBusFee.dueDate <= currentDate) {
          newStatus = 'pending';
        }
      }

      await StudentBusFee.findByIdAndUpdate(new mongoose.Types.ObjectId(payment.studentBusFeeId), {
        status: newStatus,
        modifiedDate: new Date()
      });
    }

    return NextResponse.json({ message: "Payment record deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}
