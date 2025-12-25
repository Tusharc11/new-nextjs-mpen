import { FeesType } from "../models/feesType";
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

    await dbConnect();
    const feesTypes = await FeesType.find({ 
      clientOrganizationId: token.clientOrganizationId,
      isActive: true 
    }).sort({ name: 1 });
    return NextResponse.json(feesTypes);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch fees types" },
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

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if fees type with this name already exists for this organization
    const existingFeesType = await FeesType.findOne({ 
      name: body.name,
      clientOrganizationId: token.clientOrganizationId 
    });
    if (existingFeesType) {
      return NextResponse.json(
        { error: "Fees type with this name already exists" },
        { status: 400 }
      );
    }

    const feesType = new FeesType({
      name: body.name,
      clientOrganizationId: token.clientOrganizationId,
      isActive: true,
    });

    await feesType.save();
    return NextResponse.json(feesType, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create fees type" },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, isActive } = body;

    await dbConnect();

    // Ensure the fees type belongs to the user's organization
    const feesType = await FeesType.findOneAndUpdate(
      { 
        _id: id, 
        clientOrganizationId: token.clientOrganizationId 
      },
      { name, isActive, modifiedDate: new Date() },
      { new: true }
    );

    if (!feesType) {
      return NextResponse.json(
        { error: "Fees type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(feesType);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update fees type" },
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Ensure the fees type belongs to the user's organization
    const feesType = await FeesType.findOneAndUpdate(
      { 
        _id: id, 
        clientOrganizationId: token.clientOrganizationId 
      },
      { isActive: false, modifiedDate: new Date() },
      { new: true }
    );

    if (!feesType) {
      return NextResponse.json(
        { error: "Fees type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Fees type deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete fees type" },
      { status: 500 }
    );
  }
} 