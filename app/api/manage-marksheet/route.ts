import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import MarksheetTemplate, { IAcademicSelection, IMarksheetCard, IReportCardDetails, IMarksheetTemplate, IStudentDetailsConfig, IExamConfig } from '../models/marksheetTemplate';
import { UserJwtPayload } from '@/lib/auth';
import jwt from 'jsonwebtoken';

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
            studentDetailsConfig,
            examConfigs,
            marksheetCards,
            templateName = 'Default Template'    
        }: {
            academicSelection: { classIds: string[]; templateName?: string };
            reportCardDetails?: IReportCardDetails;
            studentDetailsConfig?: IStudentDetailsConfig;
            examConfigs?: IExamConfig[];
            marksheetCards: IMarksheetCard[];
            templateName?: string;
        } = body;

        // Validate required fields
        if (!academicSelection?.classIds || academicSelection.classIds.length === 0) {
            return NextResponse.json(
                { error: 'At least one class is required' },
                { status: 400 }
            );
        }

        if (!marksheetCards || marksheetCards.length === 0) {
            return NextResponse.json(
                { error: 'At least one marksheet card is required' },
                { status: 400 }
            );
        }

        // Convert examTypeId strings to ObjectIds for examConfigs
        const processedExamConfigs = examConfigs ? examConfigs.map(config => ({
            ...config,
            examTypeId: config.examTypeId // Explicitly convert string to ObjectId
        })) : [];

        // Convert classIds strings to ObjectIds
        const processedClassIds = (academicSelection.classIds as string[]).map(
            (classId: string) => new mongoose.Types.ObjectId(classId)
        );

        // Create new marksheet template using the model
        const newTemplate = new MarksheetTemplate({
            classIds: processedClassIds,
            templateName,
            clientOrganizationId: new mongoose.Types.ObjectId(clientOrganizationId),
            reportCardDetails: reportCardDetails || { heading: '', logoBase64: '' },
            studentDetailsConfig: studentDetailsConfig || { fields: [] },
            examConfigs: processedExamConfigs,
            marksheetCards,
            createdBy: userId,
            updatedBy: userId
        });

        // Save the template (this will trigger validation and pre-save middleware)
        const savedTemplate = await newTemplate.save();

        return NextResponse.json({
            success: true,
            message: 'Marksheet template saved successfully',
            templateId: savedTemplate._id,
            template: {
                ...savedTemplate.toObject(),
                _id: savedTemplate._id.toString(),
                examConfigs: savedTemplate.examConfigs?.map((config: any) => ({
                    ...config,
                    examTypeId: config.examTypeId?.toString()
                })) || []
            }
        }, { status: 201 });

    } catch (error: any) {
        console.error('Error saving marksheet template:', error);

        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return NextResponse.json(
                { error: 'Validation failed', details: validationErrors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to save marksheet template' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const classId = searchParams.get('classId');
        const templateId = searchParams.get('templateId');
        const token = await getTokenFromRequest(request);
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const clientOrganizationId = token.clientOrganizationId;

        let templates: IMarksheetTemplate[];

        if (templateId) {
            // Find specific template by ID
            const template = await MarksheetTemplate.findById(templateId);
            templates = template ? [template] : [];
        } else if (classId) {
            // Find templates by class
            templates = await MarksheetTemplate.find({ classIds: classId, clientOrganizationId }).sort({ updatedAt: -1 });
        } else {
            // Get all templates
            templates = await MarksheetTemplate.find({ clientOrganizationId }).sort({ updatedAt: -1 });
        }

        return NextResponse.json({
            success: true,
            templates: templates.map(template => {
                const templateObj = template.toObject();

                return {
                    ...templateObj,
                    _id: (template._id as any).toString(),
                    examConfigs: templateObj.examConfigs?.map((config: any) => ({
                        ...config,
                        examTypeId: config.examTypeId?.toString()
                    })) || []
                };
            })
        });

    } catch (error) {
        console.error('Error fetching marksheet templates:', error);
        return NextResponse.json(
            { error: 'Failed to fetch marksheet templates' },
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
        const { templateId, ...updateData }: {
            templateId: string;
            academicSelection?: { classIds: string[]; templateName?: string };
            reportCardDetails?: IReportCardDetails;
            studentDetailsConfig?: IStudentDetailsConfig;
            examConfigs?: IExamConfig[];
            marksheetCards?: IMarksheetCard[];
            templateName?: string;
        } = body;

        if (!templateId) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            );
        }

        // Convert examTypeId strings to ObjectIds for examConfigs if present
        const processedUpdateData = { ...updateData };
        if (processedUpdateData.examConfigs) {
            processedUpdateData.examConfigs = processedUpdateData.examConfigs.map((config: any) => ({
                ...config,
                examTypeId: config.examTypeId // Explicitly convert string to ObjectId
            }));
        }

        // Flatten academicSelection data to match database schema
        const flattenedUpdateData: any = { ...processedUpdateData };

        if (processedUpdateData.academicSelection) {
            if (processedUpdateData.academicSelection.classIds) {
                // Convert classIds strings to ObjectIds
                const originalClassIds = processedUpdateData.academicSelection.classIds as string[];
                flattenedUpdateData.classIds = originalClassIds.map(
                    (classId: string) => new mongoose.Types.ObjectId(classId)
                );
            }

            if (processedUpdateData.academicSelection.templateName) {
                flattenedUpdateData.templateName = processedUpdateData.academicSelection.templateName;
            }

            // Remove the nested academicSelection as it's not part of the database schema
            delete flattenedUpdateData.academicSelection;
        }

        // Find and update the template by ID and clientOrganizationId
        const updatedTemplate = await MarksheetTemplate.findOneAndUpdate(
            { 
                _id: templateId,
                clientOrganizationId: new mongoose.Types.ObjectId(clientOrganizationId)
            },
            { ...flattenedUpdateData, updatedAt: new Date(), updatedBy: userId },
            { new: true, runValidators: true }
        );

        if (!updatedTemplate) {
            return NextResponse.json(
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Marksheet template updated successfully',
            template: {
                ...updatedTemplate.toObject(),
                _id: updatedTemplate._id.toString(),
                examConfigs: updatedTemplate.examConfigs?.map((config: any) => ({
                    ...config,
                    examTypeId: config.examTypeId?.toString()
                })) || []
            }
        });

    } catch (error: any) {
        console.error('Error updating marksheet template:', error);

        // Handle validation errors specifically
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map((err: any) => err.message);
            return NextResponse.json(
                { error: 'Validation failed', details: validationErrors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: error.message || 'Failed to update marksheet template' },
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
        const templateId = searchParams.get('templateId');

        if (!templateId) {
            return NextResponse.json(
                { error: 'Template ID is required' },
                { status: 400 }
            );
        }

        // Find and delete the template
        const deletedTemplate = await MarksheetTemplate.findOneAndUpdate(
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
                { error: 'Template not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Marksheet template deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting marksheet template:', error);
        return NextResponse.json(
            { error: (error as Error).message || 'Failed to delete marksheet template' },
            { status: 500 }
        );
    }
}
