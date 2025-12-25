import dbConnect from "@/lib/mongodb";
import Transport from "@/app/api/models/transport";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { UserJwtPayload } from "@/lib/auth";
import { UserRole } from "@/lib/role";
import mongoose from "mongoose";

// Helper function to get token from request
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Get token from the request
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;

    const body = await request.json();
    
    // Extract and validate required fields
    const {
      modelName,
      vehicleNumber,
      capacity,
      route,
      routeDetails,
      insuranceDetails,
      driver1Details,
      driver2Details,
      conductorDetails,
      averageFuelCostPerMonth,
      installments,
      pucDetails,
      documents
    } = body;

    // Validate required fields
    if (
      !modelName?.trim() ||
      !vehicleNumber?.trim() ||
      !route?.trim() ||
      !driver1Details
    ) {
      return NextResponse.json(
        { error: "Required fields: Model Name, Vehicle Number, Route, and Driver 1 Details must be provided" },
        { status: 400 }
      );
    }

    // Validate required driver1 details
    if (
      !driver1Details.name?.trim() ||
      !driver1Details.licenseNumber?.trim() ||
      !driver1Details.phoneNumber?.trim()
    ) {
      return NextResponse.json(
        { error: "Driver 1 name, license number, and phone number are required" },
        { status: 400 }
      );
    }

    // Validate driver2 details if any meaningful data is provided
    const hasDriver2Data = driver2Details && (
      driver2Details.name?.trim() ||
      driver2Details.licenseNumber?.trim() ||
      driver2Details.phoneNumber?.trim() ||
      driver2Details.address?.trim() ||
      driver2Details.experience ||
      driver2Details.dateOfBirth
    );

    if (hasDriver2Data && (
      !driver2Details.name?.trim() ||
      !driver2Details.licenseNumber?.trim() ||
      !driver2Details.phoneNumber?.trim() ||
      !driver2Details.address?.trim() ||
      typeof driver2Details.experience !== 'number' ||
      !driver2Details.dateOfBirth
    )) {
      return NextResponse.json(
        { error: "All driver 2 details are required when driver 2 is specified" },
        { status: 400 }
      );
    }

    // Validate conductor details if any meaningful data is provided
    const hasConductorData = conductorDetails && (
      conductorDetails.name?.trim() ||
      conductorDetails.phoneNumber?.trim() ||
      conductorDetails.address?.trim() ||
      conductorDetails.experience ||
      conductorDetails.dateOfBirth
    );

    if (hasConductorData && (
      !conductorDetails.name?.trim() ||
      !conductorDetails.phoneNumber?.trim() ||
      !conductorDetails.address?.trim() ||
      typeof conductorDetails.experience !== 'number' ||
      !conductorDetails.dateOfBirth
    )) {
      return NextResponse.json(
        { error: "All conductor details are required when conductor is specified" },
        { status: 400 }
      );
    }

    // Validate PUC details if any meaningful data is provided
    const hasPucData = pucDetails && (
      pucDetails.certificateNumber?.trim() ||
      pucDetails.issueDate ||
      pucDetails.expiryDate ||
      pucDetails.issuingAuthority?.trim()
    );

    if (hasPucData && (
      !pucDetails.certificateNumber?.trim() ||
      !pucDetails.issueDate ||
      !pucDetails.expiryDate ||
      !pucDetails.issuingAuthority?.trim()
    )) {
      return NextResponse.json(
        { error: "If PUC details are provided, all PUC fields are required" },
        { status: 400 }
      );
    }

    // Validate document types and mime types
    if (documents && Array.isArray(documents) && documents.length > 0) {
      for (const doc of documents) {
        if (doc.fileType === 'image') {
          const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
          if (!allowedImageTypes.includes(doc.mimeType)) {
            return NextResponse.json({ 
              error: "Image must be in JPG, JPEG or PNG format" 
            }, { status: 400 });
          }
        } else if (doc.fileType === 'pdf') {
          if (doc.mimeType !== 'application/pdf') {
            return NextResponse.json({
              error: "PDF document must have application/pdf mime type"
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({
            error: "Document must be either an image or PDF"
          }, { status: 400 });
        }
      }
    }
    

    // Check if bus number already exists for this organization
    const existingBus = await Transport.findOne({ 
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      clientOrganizationId,
      isActive: true 
    });
    
    if (existingBus) {
      return NextResponse.json(
        { error: "Bus number already exists. Please use a different bus number." },
        { status: 400 }
      );
    }

    // Get the next roll number for this organization
    const lastBus = await Transport.findOne({ 
      clientOrganizationId,
      isActive: true 
    }).sort({ number: -1 });

    const nextRollNumber = lastBus ? lastBus.number + 1 : 1;

    // Create new bus
    const busData: any = {
      number: nextRollNumber,
      modelName: modelName.trim(),
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      route: route.trim(),
      driver1Details: {
        name: driver1Details.name.trim(),
        licenseNumber: driver1Details.licenseNumber.trim(),
        phoneNumber: driver1Details.phoneNumber.trim(),
        address: driver1Details.address?.trim() || "",
        experience: driver1Details.experience ? parseInt(driver1Details.experience) : 0,
        dateOfBirth: driver1Details.dateOfBirth ? new Date(driver1Details.dateOfBirth) : null
      },
      driver2Details: hasDriver2Data ? {
        name: driver2Details.name.trim(),
        licenseNumber: driver2Details.licenseNumber.trim(),
        phoneNumber: driver2Details.phoneNumber.trim(),
        address: driver2Details.address.trim(),
        experience: parseInt(driver2Details.experience),
        dateOfBirth: new Date(driver2Details.dateOfBirth)
      } : undefined,
      conductorDetails: hasConductorData ? {
        name: conductorDetails.name.trim(),
        phoneNumber: conductorDetails.phoneNumber.trim(),
        address: conductorDetails.address.trim(),
        experience: parseInt(conductorDetails.experience),
        dateOfBirth: new Date(conductorDetails.dateOfBirth)
      } : undefined,
      clientOrganizationId,
      addedDate: new Date()
    };

    // Add optional fields only if provided
    if (capacity && capacity.toString().trim()) {
      busData.capacity = parseInt(capacity);
    }

    if (averageFuelCostPerMonth && averageFuelCostPerMonth.toString().trim()) {
      busData.averageFuelCostPerMonth = parseFloat(averageFuelCostPerMonth);
    }

    // Add installment type (required)
    if (!installments || !installments.trim()) {
      return NextResponse.json(
        { error: "Installment type is required" },
        { status: 400 }
      );
    }
    busData.installments = installments.trim();

    // Add documents if provided
    if (documents && Array.isArray(documents) && documents.length > 0) {
      // Validate total document size
      const totalSize = documents.reduce((sum: number, doc: any) => sum + (doc.compressedSize || 0), 0);
      if (totalSize > 6 * 1024 * 1024) { // 6MB limit
        return NextResponse.json(
          { error: "Total document size cannot exceed 6MB" },
          { status: 400 }
        );
      }

      // Validate each document
      const validDocuments = documents.filter((doc: any) => {
        return doc.filename && doc.fileType && doc.mimeType && doc.data && doc.size && doc.compressedSize;
      });

      if (validDocuments.length > 0) {
        busData.documents = validDocuments.map((doc: any) => ({
          filename: doc.filename.trim(),
          fileType: doc.fileType.toLowerCase(),
          mimeType: doc.mimeType.toLowerCase(),
          size: parseInt(doc.size),
          compressedSize: parseInt(doc.compressedSize),
          data: doc.data,
          uploadDate: new Date()
        }));
      }
    }

    // Add route details if provided
    if (routeDetails && Array.isArray(routeDetails) && routeDetails.length > 0) {
      busData.routeDetails = routeDetails.map((route: any) => ({
        id: new mongoose.Types.ObjectId(),
        destination: route.destination?.trim(),
        amount: route.amount ? parseFloat(route.amount) : 0
      }));
    }

    // Add insurance details only if any meaningful data is provided
    const hasInsuranceData = insuranceDetails && (
      insuranceDetails.policyNumber?.trim() ||
      insuranceDetails.provider?.trim() ||
      insuranceDetails.expiryDate ||
      insuranceDetails.coverageAmount ||
      insuranceDetails.policyType?.trim()
    );

    if (hasInsuranceData) {
      busData.insuranceDetails = {
        policyNumber: insuranceDetails.policyNumber?.trim() || "",
        provider: insuranceDetails.provider?.trim() || "",
        expiryDate: insuranceDetails.expiryDate ? new Date(insuranceDetails.expiryDate) : null,
        coverageAmount: insuranceDetails.coverageAmount ? parseFloat(insuranceDetails.coverageAmount) : 0,
        policyType: insuranceDetails.policyType?.trim() || ""
      };
    }

    // Add PUC details only if any meaningful data is provided
    if (hasPucData) {
      busData.pucDetails = {
        certificateNumber: pucDetails.certificateNumber?.trim() || "",
        issueDate: pucDetails.issueDate ? new Date(pucDetails.issueDate) : null,
        expiryDate: pucDetails.expiryDate ? new Date(pucDetails.expiryDate) : null,
        issuingAuthority: pucDetails.issuingAuthority?.trim() || ""
      };
    }

    const bus = await Transport.create(busData);

    return NextResponse.json(bus, { status: 201 });
  } catch (error: any) {
    console.error("Error creating bus:", error);
    return NextResponse.json(
      { error: "Failed to create bus", details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Get the URL object
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;
    const userRole = token.role;

    if (id) {
      // Fetch a specific bus
      let query = Transport.findOne({ _id: id, isActive: true });

      // Only add clientOrganizationId filter for non-super users
      if (userRole !== UserRole.SUPER) {
        query = query.where({ clientOrganizationId });
      }

      const bus = await query.select("-__v");

      if (!bus) {
        return NextResponse.json(
          { error: "Bus not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(bus, { status: 200 });
    } else {
      // Fetch all buses
      let query = Transport.find({ isActive: true });

      // Only add clientOrganizationId filter for non-super users
      if (userRole !== UserRole.SUPER) {
        query = query.where({ clientOrganizationId });
      }

      const buses = await query
        .select("-__v")
        .sort({ number: 1 });

      return NextResponse.json(buses, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch buses" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    // Extract ID from query params (URL)
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;

    if (!id) {
      return NextResponse.json({ error: "Missing bus ID" }, { status: 400 });
    }

    const body = await request.json();

    // Check if bus number is being updated and ensure it doesn't conflict
    if (body.vehicleNumber) {
      const existingBus = await Transport.findOne({
        vehicleNumber: body.vehicleNumber.trim().toUpperCase(),
        clientOrganizationId,
        isActive: true,
        _id: { $ne: id } // Exclude current bus from check
      });

      if (existingBus) {
        return NextResponse.json(
          { error: "Bus number already exists. Please use a different bus number." },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      modifiedDate: new Date()
    };

    // Only update fields that are provided
    if (body.modelName) updateData.modelName = body.modelName.trim();
    if (body.vehicleNumber) updateData.vehicleNumber = body.vehicleNumber.trim().toUpperCase();
    if (body.capacity) updateData.capacity = parseInt(body.capacity);
    if (body.route) updateData.route = body.route.trim();
    if (body.averageFuelCostPerMonth) updateData.averageFuelCostPerMonth = parseFloat(body.averageFuelCostPerMonth);
    
    // Update installments (required)
    if (body.installments !== undefined) {
      if (!body.installments || !body.installments.trim()) {
        return NextResponse.json(
          { error: "Installment type is required" },
          { status: 400 }
        );
      }
      updateData.installments = body.installments.trim();
    }
    
    // Update documents if provided
    if (body.documents && Array.isArray(body.documents)) {
      // Validate total document size
      const totalSize = body.documents.reduce((sum: number, doc: any) => sum + (doc.compressedSize || 0), 0);
      if (totalSize > 6 * 1024 * 1024) { // 6MB limit
        return NextResponse.json(
          { error: "Total document size cannot exceed 6MB" },
          { status: 400 }
        );
      }

      // Validate and format documents
      const validDocuments = body.documents.filter((doc: any) => {
        return doc.filename && doc.fileType && doc.mimeType && doc.data && doc.size && doc.compressedSize;
      });

      updateData.documents = validDocuments.map((doc: any) => ({
        filename: doc.filename.trim(),
        fileType: doc.fileType.toLowerCase(),
        mimeType: doc.mimeType.toLowerCase(),
        size: parseInt(doc.size),
        compressedSize: parseInt(doc.compressedSize),
        data: doc.data,
        uploadDate: doc.uploadDate ? new Date(doc.uploadDate) : new Date()
      }));
    }
    
    // Update route details if provided
    if (body.routeDetails && Array.isArray(body.routeDetails)) {
      updateData.routeDetails = body.routeDetails.map((route: any) => ({
        id: route.id ? new mongoose.Types.ObjectId(route.id) : new mongoose.Types.ObjectId(), // Keep existing ID or generate new one
        destination: route.destination?.trim(),
        amount: route.amount ? parseFloat(route.amount) : 0
      }));
    }

    if (body.insuranceDetails) {
      updateData.insuranceDetails = {
        policyNumber: body.insuranceDetails.policyNumber?.trim(),
        provider: body.insuranceDetails.provider?.trim(),
        expiryDate: body.insuranceDetails.expiryDate ? new Date(body.insuranceDetails.expiryDate) : undefined,
        coverageAmount: body.insuranceDetails.coverageAmount ? parseFloat(body.insuranceDetails.coverageAmount) : undefined,
        policyType: body.insuranceDetails.policyType?.trim()
      };
    }

    if (body.driver1Details) {
      updateData.driver1Details = {
        name: body.driver1Details.name?.trim(),
        licenseNumber: body.driver1Details.licenseNumber?.trim(),
        phoneNumber: body.driver1Details.phoneNumber?.trim(),
        address: body.driver1Details.address?.trim(),
        experience: body.driver1Details.experience ? parseInt(body.driver1Details.experience) : undefined,
        dateOfBirth: body.driver1Details.dateOfBirth ? new Date(body.driver1Details.dateOfBirth) : undefined
      };
    }

    if (body.driver2Details) {
      updateData.driver2Details = {
        name: body.driver2Details.name?.trim(),
        licenseNumber: body.driver2Details.licenseNumber?.trim(),
        phoneNumber: body.driver2Details.phoneNumber?.trim(),
        address: body.driver2Details.address?.trim(),
        experience: body.driver2Details.experience ? parseInt(body.driver2Details.experience) : undefined,
        dateOfBirth: body.driver2Details.dateOfBirth ? new Date(body.driver2Details.dateOfBirth) : undefined
      };
    }

    if (body.conductorDetails) {
      updateData.conductorDetails = {
        name: body.conductorDetails.name?.trim(),
        phoneNumber: body.conductorDetails.phoneNumber?.trim(),
        address: body.conductorDetails.address?.trim(),
        experience: body.conductorDetails.experience ? parseInt(body.conductorDetails.experience) : undefined,
        dateOfBirth: body.conductorDetails.dateOfBirth ? new Date(body.conductorDetails.dateOfBirth) : undefined
      };
    }

    if (body.pucDetails) {
      updateData.pucDetails = {
        certificateNumber: body.pucDetails.certificateNumber?.trim(),
        issueDate: body.pucDetails.issueDate ? new Date(body.pucDetails.issueDate) : undefined,
        expiryDate: body.pucDetails.expiryDate ? new Date(body.pucDetails.expiryDate) : undefined,
        issuingAuthority: body.pucDetails.issuingAuthority?.trim()
      };
    }

    const bus = await Transport.findByIdAndUpdate(id, updateData, {
      new: true,
    }).where({ clientOrganizationId });

    if (!bus) {
      return NextResponse.json(
        { error: "Bus not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(bus, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to update bus", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const token = await getTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;

    if (!id) {
      return NextResponse.json({ error: "Missing bus ID" }, { status: 400 });
    }

    // Soft delete by setting isActive to false
    const bus = await Transport.findByIdAndUpdate(id, {
      isActive: false,
      modifiedDate: new Date()
    }).where({ clientOrganizationId });

    if (!bus) {
      return NextResponse.json(
        { error: "Bus not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Bus deleted successfully" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to delete bus", details: error.message },
      { status: 500 }
    );
  }
}
