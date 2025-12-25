import { NextRequest, NextResponse } from "next/server";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/mongodb";
// Import all required models to ensure they're registered
import "@/app/api/models/class";
import "@/app/api/models/section";
import "@/app/api/models/feesType";
import "@/app/api/models/session";
import "@/app/api/models/clientOrganization";
import { FeesStructure } from "../models/feesStructure";

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
    console.error("Token verification failed:", error);
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
    const id = searchParams.get("id");
    const classId = searchParams.get("classId");
    const academicYearId = searchParams.get("academicYearId");

    await dbConnect();  
    
    // If ID is provided, fetch single record
    if (id) {
      const feesStructure = await FeesStructure.findOne({
        _id: id,
        clientOrganizationId: token.clientOrganizationId,
        isActive: true
      })
      .populate('classId', 'classNumber _id')
      .populate('sectionId', 'section _id')
      .populate('feesTypes.feesTypeId', 'name _id')
      .populate('academicYearId', 'startDate endDate _id');
      
      if (!feesStructure) {
        return NextResponse.json({ error: "Fees structure not found" }, { status: 404 });
      }
      
      return NextResponse.json(feesStructure);
    }
    
    // Otherwise, fetch all matching records
    let query: any = {
      clientOrganizationId: token.clientOrganizationId,
      isActive: true
    };

    if (classId) query.classId = classId;
    if (academicYearId) query.academicYearId = academicYearId;

    const feesStructures = await FeesStructure.find(query)
      .populate('classId', 'classNumber _id')
      .populate('sectionId', 'section _id')
      .populate('feesTypes.feesTypeId', 'name _id')
      .populate('academicYearId', 'startDate endDate _id')
      .sort({ createdAt: -1 });

    return NextResponse.json(feesStructures);
  } catch (error) {
    console.error("Error fetching fees structures:", error);
    return NextResponse.json(
      { error: "Failed to fetch fees structures" },
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
    const {
      classId,
      sectionId,
      academicYearId,
      installment,
      feesTypes,
      dueDates,
      isActive = true
    } = body;

    // Validation
    if (!classId || !sectionId || !academicYearId || !installment || !feesTypes || !Array.isArray(feesTypes) || feesTypes.length === 0 || !dueDates || !Array.isArray(dueDates) || dueDates.length === 0) {
      return NextResponse.json(
        { error: "All required fields must be provided including due dates array" },
        { status: 400 }
      );
    }

    // Validate due dates based on installment
    const expectedDueDates = {
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

    if (dueDates.length !== expectedDueDates[installment as keyof typeof expectedDueDates]) {
      return NextResponse.json(
        { error: `${installment} payment requires exactly ${expectedDueDates[installment as keyof typeof expectedDueDates ]} due date(s)` },
        { status: 400 }
      );
    }

    // Validate each fee type and amount
    for (let i = 0; i < feesTypes.length; i++) {
      const feeType = feesTypes[i];
      if (!feeType.feesTypeId || !feeType.amount || feeType.amount <= 0) {
        return NextResponse.json(
          { error: `Fee type ${i + 1}: Must have a valid fee type selected and amount greater than 0` },
          { status: 400 }
        );
      }
    }

    // Filter out any fee types with empty feesTypeId
    const validFeesTypes = feesTypes.filter(ft => ft.feesTypeId && ft.feesTypeId.trim() !== '');
    
    if (validFeesTypes.length === 0) {
      return NextResponse.json(
        { error: "At least one valid fee type must be selected" },
        { status: 400 }
      );
    }

    // Calculate total amount using valid fee types
    const totalAmount = validFeesTypes.reduce((sum: number, feeType: any) => sum + feeType.amount, 0);

    await dbConnect();

    // Check if similar fees structure already exists
    const existingStructure = await FeesStructure.findOne({
      classId,
      academicYearId,
      installment,
      clientOrganizationId: token.clientOrganizationId,
      isActive: true
    });

    if (existingStructure) {
      return NextResponse.json(
        { error: "Fees structure for this class, academic year, and installment already exists" },
        { status: 400 }
      );
    }

    const feesStructure = new FeesStructure({
      classId,
      sectionId: Array.isArray(sectionId) ? sectionId : [sectionId],
      clientOrganizationId: token.clientOrganizationId,
      academicYearId,
      installment,
      feesTypes: validFeesTypes,
      totalAmount,
      dueDates: dueDates.map(date => new Date(date)),
      isActive,
    });

    await feesStructure.save();
    
    // Populate the created structure before returning
    const populatedStructure = await FeesStructure.findById(feesStructure._id)
      .populate('classId', 'classNumber')
      .populate('sectionId', 'section')
      .populate('feesTypes.feesTypeId', 'name')
      .populate('academicYearId', 'startDate endDate');

    return NextResponse.json(populatedStructure, { status: 201 });
  } catch (error) {
    console.error("Error creating fees structure:", error);
    return NextResponse.json(
      { error: "Failed to create fees structure" },
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
    const {
      classId,
      sectionId,
      academicYearId,
      installment,
      feesTypes,
      dueDates,
      isActive
    } = body;

    // Validate due dates based on installment if provided
    if (dueDates && installment) {
      const expectedDueDates = {
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

      if (dueDates.length !== expectedDueDates[installment as keyof typeof expectedDueDates]) {
        return NextResponse.json(
          { error: `${installment} payment requires exactly ${expectedDueDates[installment as keyof typeof expectedDueDates]} due date(s)` },
          { status: 400 }
        );
      }
    }

    // Calculate total amount
    const totalAmount = feesTypes ? feesTypes.reduce((sum: number, feeType: any) => sum + feeType.amount, 0) : 0;

    await dbConnect();

    const feesStructure = await FeesStructure.findOneAndUpdate(
      { _id: id, clientOrganizationId: token.clientOrganizationId },
      {
        classId,
        sectionId: Array.isArray(sectionId) ? sectionId : [sectionId],
        academicYearId,
        installment,
        feesTypes,
        totalAmount,
        dueDates: dueDates ? dueDates.map((date: any) => new Date(date)) : undefined,
        isActive,
        modifiedDate: new Date()
      },
      { new: true }
    )
    .populate('classId', 'classNumber')
    .populate('sectionId', 'section')
    .populate('feesTypes.feesTypeId', 'name')
    .populate('academicYearId', 'startDate endDate');

    if (!feesStructure) {
      return NextResponse.json(
        { error: "Fees structure not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(feesStructure);
  } catch (error) {
    console.error("Error updating fees structure:", error);
    return NextResponse.json(
      { error: "Failed to update fees structure" },
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

    const feesStructure = await FeesStructure.findOneAndUpdate(
      { _id: id, clientOrganizationId: token.clientOrganizationId },
      { isActive: false, modifiedDate: new Date() },
      { new: true }
    );

    if (!feesStructure) {
      return NextResponse.json(
        { error: "Fees structure not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Fees structure deleted successfully" });
  } catch (error) {
    console.error("Error deleting fees structure:", error);
    return NextResponse.json(
      { error: "Failed to delete fees structure" },
      { status: 500 }
    );
  }
} 