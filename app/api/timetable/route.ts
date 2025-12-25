import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Timetable from "../models/timetable";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { UserRole } from "@/lib/role";
import StudentClass from "../models/studentClass";
import "@/app/api/models/session";
import "@/app/api/models/studentClass";

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

// Function to count PDF pages by analyzing PDF content
const countPdfPages = (buffer: Buffer): number => {
  try {
    const pdfText = buffer.toString('binary');
    
    // Method 1: Count /Type /Page objects
    const pageMatches = pdfText.match(/\/Type\s*\/Page[^s]/g);
    if (pageMatches) {
      return pageMatches.length;
    }
    
    // Method 2: Count /Count in Pages object - using [\s\S] instead of . with s flag
    const countMatch = pdfText.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
    if (countMatch) {
      return parseInt(countMatch[1]);
    }
    
    // Method 3: Simple heuristic - count page breaks
    const pageBreaks = pdfText.match(/endobj/g);
    if (pageBreaks && pageBreaks.length > 0) {
      // Rough estimate: typically 3-5 objects per page
      const estimatedPages = Math.ceil(pageBreaks.length / 4);
      return estimatedPages;
    }
    
    // Default to 1 if we can't determine
    return 1;
  } catch (error) {
    // Default to 1 page if we can't analyze
    return 1;
  }
};

// GET - List timetables by academic year
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");
    const timetableId = searchParams.get("id");
    const isStudentTimetable = searchParams.get("isStudentTimetable");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const studentId = searchParams.get("studentId");
    const role = searchParams.get("role");

    // If requesting a specific timetable file
    if (timetableId) {
      const timetable = await Timetable.findById(timetableId)
        .where({ clientOrganizationId: token.clientOrganizationId, isActive: true });

      if (!timetable) {
        return NextResponse.json({ error: "Timetable not found" }, { status: 404 });
      }

      // Return the PDF file
      return new NextResponse(timetable.fileData, {
        headers: {
          'Content-Type': timetable.mimeType,
          'Content-Disposition': `inline; filename="${timetable.fileName}"`,
        },
      });
    }

    // Handle student role - fetch timetables based on student's class and section
    if (role === UserRole.STUDENT && studentId && academicYearId) {
      const studentClass = await StudentClass.findOne({
        studentId: studentId,
        isActive: true,
      });

      if (studentClass) {
        const studentQuery = {
          clientOrganizationId: token.clientOrganizationId,
          isActive: true,
          academicYearId: academicYearId,
          isStudentTimetable: true,
          classId: studentClass.class._id,
          sectionId: studentClass.section._id,
        };

        // Get list of timetables (without file data for performance)
        const timetables = await Timetable.find(studentQuery)
          .select('-fileData') // Exclude file data from list
          .populate('academicYearId', 'startDate endDate')
          .populate('uploadedBy', 'firstName lastName')
          .populate('classId', 'classNumber')
          .populate('sectionId', 'section')
          .sort({ addedDate: -1 });

        return NextResponse.json(timetables);
      } else {
        // No student class found, return empty array
        return NextResponse.json([]);
      }
    }

    // Build query for non-student users or when student parameters are not provided
    const query: any = {
      clientOrganizationId: token.clientOrganizationId,
      isActive: true
    };

    if (academicYearId) {
      query.academicYearId = academicYearId;
    }

    if (isStudentTimetable !== null) {
      query.isStudentTimetable = isStudentTimetable === 'true';
    }

    if (classId) {
      query.classId = classId;
    }

    if (sectionId) {
      query.sectionId = sectionId;
    }

    // Get list of timetables (without file data for performance)
    const timetables = await Timetable.find(query)
      .select('-fileData') // Exclude file data from list
      .populate('academicYearId', 'startDate endDate')
      .populate('uploadedBy', 'firstName lastName')
      .populate('classId', 'classNumber')
      .populate('sectionId', 'section')
      .sort({ addedDate: -1 });

    return NextResponse.json(timetables);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch timetables" },
      { status: 500 }
    );
  }
}

// POST - Upload new timetable
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user permissions (only ADMIN and STAFF can upload)
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const file = formData.get('file') as File;
    const academicYearId = formData.get('academicYearId') as string;
    const isStudentTimetable = formData.get('isStudentTimetable') === 'true';
    const classId = formData.get('classId') as string;
    const sectionId = formData.get('sectionId') as string;

    // Validation
    if (!title || !file || !academicYearId) {
      return NextResponse.json(
        { error: "Title, file, and academic year are required" },
        { status: 400 }
      );
    }

    // Additional validation for student timetables
    if (isStudentTimetable && (!classId || !sectionId)) {
      return NextResponse.json(
        { error: "Class and section are required for student timetables" },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (limit to 5MB to match frontend)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer for analysis
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Validate that PDF has only one page
    const pageCount = countPdfPages(fileBuffer);
    if (pageCount > 1) {
      return NextResponse.json(
        { error: "Only single-page PDF files are allowed" },
        { status: 400 }
      );
    }

    // Check if timetable with same title exists for this academic year
    const existingTimetable = await Timetable.findOne({
      title: title.trim(),
      academicYearId,
      clientOrganizationId: token.clientOrganizationId,
      isActive: true
    });

    if (existingTimetable) {
      return NextResponse.json(
        { error: "A timetable with this title already exists for the selected academic year" },
        { status: 409 }
      );
    }

    // Create timetable document
    const timetableData: any = {
      title: title.trim(),
      fileName: file.name,
      fileData: fileBuffer,
      mimeType: file.type,
      academicYearId,
      clientOrganizationId: token.clientOrganizationId,
      uploadedBy: token.id,
      isStudentTimetable,
      isActive: true,
      addedDate: new Date()
    };

    // Add class and section only for student timetables
    if (isStudentTimetable && classId && sectionId) {
      timetableData.classId = classId;
      timetableData.sectionId = sectionId;
    }

    const timetable = await Timetable.create(timetableData);

    // Return response without file data
    const response = await Timetable.findById(timetable._id)
      .select('-fileData')
      .populate('academicYearId', 'startDate endDate')
      .populate('uploadedBy', 'firstName lastName');

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to upload timetable" },
      { status: 500 }
    );
  }
}

// DELETE - Delete timetable (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user permissions
    if (token.role !== 'ADMIN' && token.role !== 'STAFF') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const timetableId = searchParams.get("id");

    if (!timetableId) {
      return NextResponse.json({ error: "Timetable ID is required" }, { status: 400 });
    }

    const timetable = await Timetable.findOneAndUpdate(
      { 
        _id: timetableId, 
        clientOrganizationId: token.clientOrganizationId,
        isActive: true 
      },
      { 
        isActive: false,
        modifiedDate: new Date()
      },
      { new: true }
    );

    if (!timetable) {
      return NextResponse.json({ error: "Timetable not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Timetable deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete timetable" },
      { status: 500 }
    );
  }
}
