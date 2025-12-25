import LateFee from "../models/lateFee";
import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";

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
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");

    await dbConnect();
    const lateFees = await LateFee.find({
      clientOrganizationId: token.clientOrganizationId,
      isActive: true,
      academicYearId
    }).sort({ amount: 1 }).populate('classId', 'classNumber _id');

    return NextResponse.json(lateFees);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch late fees" },
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

    // Check if user has admin/staff role
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { classId, academicYearId, installment, amount, isActive = true } = body;

    if (!classId || !academicYearId || !amount) {
      return NextResponse.json(
        { error: "Class ID, academic year ID, installment, and amount are required" },
            { status: 400 }
      );
    }

    if (amount < 0) {
      return NextResponse.json(
        { error: "Amount must be greater than or equal to 0" },
        { status: 400 }
      );
    }

    await dbConnect();

    const lateFee = new LateFee({
      classId,
      academicYearId,
      amount,
      clientOrganizationId: token.clientOrganizationId,
      isActive,
    });

    await lateFee.save();
    return NextResponse.json(lateFee, { status: 201 });
  } catch (error) {
    console.error("Error creating late fee:", error);
    return NextResponse.json(
      { error: "Failed to create late fee" },
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

    // Check if user has admin/staff role
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { classId, academicYearId, amount, isActive = true } = body;

    if (amount < 0) {
      return NextResponse.json(
        { error: "Amount must be greater than or equal to 0" },
        { status: 400 }
      );
    }

    await dbConnect();

    const lateFee = await LateFee.findOneAndUpdate(
      { _id: id, clientOrganizationId: token.clientOrganizationId },
      { classId, academicYearId, amount, isActive, modifiedDate: new Date() },
      { new: true }
    );

    if (!lateFee) {
      return NextResponse.json(
        { error: "Late fee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(lateFee);
  } catch (error) {
    console.error("Error updating late fee:", error);
    return NextResponse.json(
      { error: "Failed to update late fee" },
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

    // Check if user has admin role
    if (token.role !== 'ADMIN') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const lateFee = await LateFee.findOneAndUpdate(
      { _id: id, clientOrganizationId: token.clientOrganizationId },
      { isActive: false, modifiedDate: new Date() },
      { new: true }
    );

    if (!lateFee) {
      return NextResponse.json(
        { error: "Late fee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Late fee deleted successfully" });
  } catch (error) {
    console.error("Error deleting late fee:", error);
    return NextResponse.json(
      { error: "Failed to delete late fee" },
      { status: 500 }
    );
  }
} 