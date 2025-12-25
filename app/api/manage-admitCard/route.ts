import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import AdmitCardTemplate, {
  IAdmitCardDetails,
  IAdmitCardTemplate,
  IStudentDetailsConfig,
  IAdmitCard,
} from "../models/admitCardTemplate";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";

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
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;
    const userId = token.id;
    const body = await request.json();
    const {
      academicSelection,
      reportCardDetails,
      admitCardDetails,
      studentDetailsConfig,
      admitCards,
      templateName = "Default Admit Card Template",
      
    }: {
      academicSelection: { classIds: string[]; templateName?: string };
      reportCardDetails?: IAdmitCardDetails;
      admitCardDetails?: IAdmitCardDetails;
      studentDetailsConfig?: IStudentDetailsConfig;
      admitCards?: IAdmitCard[];
      templateName?: string;
    } = body;

    // Validate required fields
    if (
      !academicSelection?.classIds ||
      academicSelection.classIds.length === 0
    ) {
      return NextResponse.json(
        { error: "At least one class is required" },
        { status: 400 }
      );
    }

    // Convert classIds strings to ObjectIds
    const processedClassIds = (academicSelection.classIds as string[]).map(
      (classId: string) => new mongoose.Types.ObjectId(classId)
    );

     // Use reportCardDetails if provided, otherwise fall back to admitCardDetails
     const finalAdmitCardDetails = reportCardDetails ||
       admitCardDetails || {
         logoBase64: "",
       };

    // Process student details config to ensure proper format
    let processedStudentDetailsConfig: any = { fields: [] };
    if (studentDetailsConfig?.fields) {
      if (Array.isArray(studentDetailsConfig.fields)) {
        // Check if fields are objects or strings
        if (
          studentDetailsConfig.fields.length > 0 &&
          typeof studentDetailsConfig.fields[0] === "object"
        ) {
          // Fields are already objects, use them directly
          processedStudentDetailsConfig = studentDetailsConfig;
        } else {
          // Fields are string IDs, convert to the expected format for backward compatibility
          processedStudentDetailsConfig = {
            fields: studentDetailsConfig.fields as unknown as string[],
          };
        }
      }
    }

    // Process admit cards to ensure they have valid fields
    const processedAdmitCards = (admitCards || []).map((card) => ({
      ...card,
      fields: (card.fields || []).filter((field) => field && field.trim()),
    }));

    // Create new admit card template using the model
    const newTemplate = new AdmitCardTemplate({
      classIds: processedClassIds,
      templateName,
      clientOrganizationId: new mongoose.Types.ObjectId(clientOrganizationId),
      admitCardDetails: finalAdmitCardDetails,
      studentDetailsConfig: processedStudentDetailsConfig,
      admitCards: processedAdmitCards,
      createdBy: userId,
      updatedBy: userId
    });

    // Save the template (this will trigger validation and pre-save middleware)
    const savedTemplate = await newTemplate.save();

    return NextResponse.json(
      {
        success: true,
        message: "Admit card template saved successfully",
        templateId: savedTemplate._id,
        template: {
          ...savedTemplate.toObject(),
          _id: savedTemplate._id.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving admit card template:", error);

    // Handle validation errors specifically
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to save admit card template" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const templateId = searchParams.get("templateId");

    let templates: IAdmitCardTemplate[];
    let query: any = {};

    if (templateId) {
      // Find specific template by ID
      const template = await AdmitCardTemplate.findById(templateId);
      templates = template ? [template] : [];
    } else if (classId) {
      // Find templates by class
      templates = await AdmitCardTemplate.find({ classIds: classId, clientOrganizationId }).sort({
        updatedAt: -1,
      });
    } else {
      // Get all templates
      templates = await AdmitCardTemplate.find({ clientOrganizationId }).sort({ updatedAt: -1 });
    }

    return NextResponse.json({
      success: true,
      templates: templates.map((template) => {
        const templateObj = template.toObject();

        return {
          ...templateObj,
          _id: (template._id as any).toString(),
        };
      }),
    });
  } catch (error) {
    console.error("Error fetching admit card templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch admit card templates" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;
    const userId = token.id;
    const body = await request.json();
    const {
      templateId,
      ...updateData
    }: {
      templateId: string;
      academicSelection?: { classIds: string[]; templateName?: string };
      reportCardDetails?: IAdmitCardDetails;
      admitCardDetails?: IAdmitCardDetails;
      studentDetailsConfig?: IStudentDetailsConfig;
      admitCards?: IAdmitCard[];
      templateName?: string;
    } = body;

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Flatten academicSelection data to match database schema
    const flattenedUpdateData: any = { ...updateData };

    if (updateData.academicSelection) {
      if (updateData.academicSelection.classIds) {
        // Convert classIds strings to ObjectIds
        const originalClassIds = updateData.academicSelection
          .classIds as string[];
        flattenedUpdateData.classIds = originalClassIds.map(
          (classId: string) => new mongoose.Types.ObjectId(classId)
        );
      }

      if (updateData.academicSelection.templateName) {
        flattenedUpdateData.templateName =
          updateData.academicSelection.templateName;
      }

      // Remove the nested academicSelection as it's not part of the database schema
      delete flattenedUpdateData.academicSelection;
    }

    // Handle reportCardDetails vs admitCardDetails
    if (updateData.reportCardDetails) {
      flattenedUpdateData.admitCardDetails = updateData.reportCardDetails;
      delete flattenedUpdateData.reportCardDetails;
    }

    // Process student details config to ensure proper format
    if (updateData.studentDetailsConfig?.fields) {
      if (Array.isArray(updateData.studentDetailsConfig.fields)) {
        // Check if fields are objects or strings
        if (
          updateData.studentDetailsConfig.fields.length > 0 &&
          typeof updateData.studentDetailsConfig.fields[0] === "object"
        ) {
          // Fields are already objects, use them directly
          flattenedUpdateData.studentDetailsConfig =
            updateData.studentDetailsConfig;
        } else {
          // Fields are string IDs, convert to the expected format for backward compatibility
          flattenedUpdateData.studentDetailsConfig = {
            fields: updateData.studentDetailsConfig
              .fields as unknown as string[],
          };
        }
      }
    }

    // Process admit cards to ensure they have valid fields
    if (updateData.admitCards) {
      flattenedUpdateData.admitCards = updateData.admitCards.map((card) => ({
        ...card,
        fields: (card.fields || []).filter((field) => field && field.trim()),
      }));
    }

    // Find and update the template
    const updatedTemplate = await AdmitCardTemplate.findOneAndUpdate(
      { 
        _id: templateId,
        clientOrganizationId: new mongoose.Types.ObjectId(clientOrganizationId)
      },
      { ...flattenedUpdateData, updatedAt: new Date(), updatedBy: userId },
      { new: true, runValidators: true }
    );

    if (!updatedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admit card template updated successfully",
      template: {
        ...updatedTemplate.toObject(),
        _id: updatedTemplate._id.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating admit card template:", error);

    // Handle validation errors specifically
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return NextResponse.json(
        { error: "Validation failed", details: validationErrors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update admit card template" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;
    const userId = token.id;
    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get("templateId");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    // Find and delete the template
    const deletedTemplate = await AdmitCardTemplate.findOneAndUpdate(
      { 
        _id: templateId,
        clientOrganizationId: new mongoose.Types.ObjectId(clientOrganizationId)
      },
      {
        isActive: false,
        updatedAt: new Date(),
        updatedBy: userId
      }
    );

    if (!deletedTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admit card template deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting admit card template:", error);
    return NextResponse.json(
      {
        error:
          (error as Error).message || "Failed to delete admit card template",
      },
      { status: 500 }
    );
  }
}
