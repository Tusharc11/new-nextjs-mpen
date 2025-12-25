import { DiscountType } from "../models/discountType";
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
    const discountTypes = await DiscountType.find({
      clientOrgId: token.clientOrganizationId,
      isActive: true,
      academicYearId
    }).sort({ type: 1, value: 1 });

    return NextResponse.json(discountTypes);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch discount types" },
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
    const { type, value, isActive = true, academicYearId } = body;

    if (!type || value === undefined || value === null) {
      return NextResponse.json(
        { error: "Type and value are required" },
        { status: 400 }
      );
    }

    if (!['PERCENTAGE', 'FLAT'].includes(type)) {
      return NextResponse.json(
        { error: "Type must be either PERCENTAGE or FLAT" },
        { status: 400 }
      );
    }

    if (value < 0) {
      return NextResponse.json(
        { error: "Value must be greater than or equal to 0" },
        { status: 400 }
      );
    }

    if (type === 'PERCENTAGE' && value > 100) {
      return NextResponse.json(
        { error: "Percentage value cannot exceed 100" },
        { status: 400 }
      );
    }

    await dbConnect();

    const discountType = new DiscountType({
      type,
      value,
      clientOrgId: token.clientOrganizationId,
      isActive,
      academicYearId,
    });

    await discountType.save();
    return NextResponse.json(discountType, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create discount type" },
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
    const { type, value, isActive, academicYearId } = body;

    if (type === 'PERCENTAGE' && value > 100) {
      return NextResponse.json(
        { error: "Percentage value cannot exceed 100" },
        { status: 400 }
      );
    }

    await dbConnect();

    const discountType = await DiscountType.findOneAndUpdate(
      { _id: id, clientOrgId: token.clientOrganizationId },
      { type, value, isActive, academicYearId, modifiedDate: new Date() },
      { new: true }
    );

    if (!discountType) {
      return NextResponse.json(
        { error: "Discount type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(discountType);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update discount type" },
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

    const discountType = await DiscountType.findOneAndUpdate(
      { _id: id, clientOrgId: token.clientOrganizationId },
      { isActive: false, modifiedDate: new Date() },
      { new: true }
    );

    if (!discountType) {
      return NextResponse.json(
        { error: "Discount type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Discount type deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete discount type" },
      { status: 500 }
    );
  }
} 