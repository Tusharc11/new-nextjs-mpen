import dbConnect from "@/lib/mongodb";
import StudentClass from "../models/studentClass";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Class } from "../models/class";
import Section from "../models/section";
import User from "../models/user";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import StudentFee from "../models/studentFee";
import FeesStructure from "../models/feesStructure";
import StudentBusFee from "../models/studentBusFee";
import StudentBus from "../models/studentBus";
import Transport from "../models/transport";
import mongoose from "mongoose";
import "@/app/api/models/subject";

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
    const data = await request.json();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Verify that class and section exist(if needed)

    const clientOrganizationId = token.clientOrganizationId;

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const existingUser = await User.findOne({ email: data.email }).where({
      clientOrganizationId,
    });
    if (existingUser) {
      return NextResponse.json(
        {
          error: "Email already exists. Please use a different email address.",
        },
        { status: 400 }
      );
    }

    if (!data.classId || !data.sectionId || !data.academicYearId) {
      return NextResponse.json(
        { error: "Invalid class, section or academic year" },
        { status: 400 }
      );
    }

    // Get the fees structure for the class and section
    const feesStructure = await FeesStructure.findOne({
      classId: data.classId,
      sectionId: { $in: [data.sectionId] },
      academicYearId: data.academicYearId,
      clientOrganizationId: clientOrganizationId,
      isActive: true,
    });

    if (!feesStructure) {
      return NextResponse.json(
        { error: `No fee structure found for this class and section` },
        { status: 400 }
      );
    }

    // Create new user with hashed password
    const userData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: hashedPassword,
      address: data.address,
      role: data.role,
      dateJoined: data.dateJoined,
      clientOrganizationId: clientOrganizationId,
      dateOfBirth: data.dateOfBirth,
      bloodGroup: data.bloodGroup,
      gender: data.gender,
      phoneNumber: data.phoneNumber,
      parentPhoneNumber: data.parentPhoneNumber,
    };

    // Get the highest roll number in this class and section
    const existingStudents = await StudentClass.find({
      class: data.classId,
      section: data.sectionId,
      academicYear: data.academicYearId,
      isActive: true,
    })
      .sort({ rollNumber: -1 })
      .limit(1);

    // Calculate new roll number
    const rollNumber =
      existingStudents.length > 0 ? existingStudents[0].rollNumber + 1 : 1;

    const user = await User.create(userData);
    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      );
    }

    // Create student fees based on the fee structure's due dates
    if (feesStructure.dueDates && feesStructure.dueDates.length > 0) {
      for (let i = 0; i < feesStructure.dueDates.length; i++) {
        const dueDate = feesStructure.dueDates[i];
        const currentDate = new Date();

        // Determine status based on due date and position
        let status = "not_started";
        if (i === 0) {
          // First payment is pending if due date hasn't passed, overdue if it has
          status = new Date(dueDate) < currentDate ? "overdue" : "pending";
        } else {
          // Later payments start as not_started
          status = "not_started";
        }

        await StudentFee.create({
          studentId: user._id,
          feesStructureId: feesStructure._id,
          dueDate: dueDate,
          status: status,
          isActive: true,
          addedDate: new Date(),
        });
      }
    }

    // Create student bus fees if transport is selected
    if (data.isBusTaken && data.busId && data.routeId) {
      try {
        // Get the transport details
        const transport = await Transport.findById(data.busId);
        if (!transport) {
          return NextResponse.json(
            { error: "Selected bus not found" },
            { status: 400 }
          );
        }

        // Find the route details by ID
        const routeDetail = transport.routeDetails?.find(
          (route: any) => route.id.toString() === data.routeId
        );
        
        if (!routeDetail) {
          return NextResponse.json(
            { error: "Selected route not found" },
            { status: 400 }
          );
        }

        // Calculate number of installments and due dates based on installment type
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const dueDates: Date[] = [];

        switch (transport.installments) {
          case 'monthly':
            // Create 12 monthly installments
            for (let i = 0; i < 12; i++) {
              const dueDate = new Date(currentYear, currentDate.getMonth() + i, 1);
              dueDates.push(dueDate);
            }
            break;
          case '3months':
            // Create 4 quarterly installments
            for (let i = 0; i < 4; i++) {
              const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 3), 1);
              dueDates.push(dueDate);
            }
            break;
          case '4months':
            // Create 3 installments (4-month periods)
            for (let i = 0; i < 3; i++) {
              const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 4), 1);
              dueDates.push(dueDate);
            }
            break;
          case '6months':
            // Create 2 half-yearly installments
            for (let i = 0; i < 2; i++) {
              const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 6), 1);
              dueDates.push(dueDate);
            }
            break;
          case 'yearly':
            // Create 1 yearly installment
            const dueDate = new Date(currentYear, currentDate.getMonth(), 1);
            dueDates.push(dueDate);
            break;
          default:
            // Default to monthly if installment type is not recognized
            for (let i = 0; i < 12; i++) {
              const dueDate = new Date(currentYear, currentDate.getMonth() + i, 1);
              dueDates.push(dueDate);
            }
        }

        // Create StudentBus entry first to track the student's bus assignment
        const studentBus = await StudentBus.create({
          studentId: user._id,
          classId: data.classId,
          sectionId: data.sectionId,
          academicYearId: data.academicYearId,
          transportId: data.busId,
          routeDetailsId: new mongoose.Types.ObjectId(data.routeId), // Convert string to ObjectId
          isActive: true,
          addedDate: new Date(),
        });

        // Create student bus fee entries using the correct studentBusId
        for (let i = 0; i < dueDates.length; i++) {
          const dueDate = dueDates[i];
          
          // Determine status based on due date and position
          let status = "not_started";
          if (i === 0) {
            // First payment is pending if due date hasn't passed, overdue if it has
            status = dueDate < currentDate ? "overdue" : "pending";
          } else {
            // Later payments start as not_started
            status = "not_started";
          }

          await StudentBusFee.create({
            studentId: user._id,
            studentBusId: studentBus._id, // Use the created StudentBus ID
            routeDestination: routeDetail.id, // Store the destination name for fee tracking
            amount: routeDetail.amount,
            dueDate: dueDate,
            status: status,
            isActive: true,
            addedDate: new Date(),
          });
        }
      } catch (error) {
        console.error("Error creating student bus fees:", error);
        // Don't fail the entire operation, just log the error
      }
    }

    const studentClass = await StudentClass.create({
      studentId: user._id,
      class: data.classId,
      section: data.sectionId,
      academicYear: data.academicYearId,
      rollNumber: rollNumber,
      subjects: data.subjectIds || [],
      isBusTaken: data.isBusTaken || false,
      isActive: true,
    });

    return NextResponse.json(studentClass);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create student class" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const sectionId = searchParams.get("sectionId");
    const subjectId = searchParams.get("subjectId");
    const getSectionsWithSubject = searchParams.get("getSectionsWithSubject");
    
    if (id) {
      const studentClass = await StudentClass.findOne({
        _id: id,
        isActive: true,
      })
        .populate("class")
        .populate("section")
        .populate("subjects")
        .select("-__v");

      if (!studentClass) {
        return NextResponse.json(
          { error: "Student class not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(studentClass);
    } else if (studentId) {
      const studentClass = await StudentClass.findOne({
        studentId,
        isActive: true,
      })
        .populate("class")
        .populate("section")
        .populate("subjects")
        .select("-__v");

      // Also fetch StudentBus data if it exists
      let studentBusData = null;
      let transportDetails = null;
      let routeDetails = null;

      const studentBus = await StudentBus.findOne({
        studentId,
        isActive: true
      });

      if (studentBus) {
        studentBusData = studentBus;
        
        // Fetch transport details
        const transport = await Transport.findById(studentBus.transportId);
        if (transport) {
          transportDetails = transport;
          
          // Find the specific route details using the ObjectId
          if (transport.routeDetails && transport.routeDetails.length > 0) {
            routeDetails = transport.routeDetails.find(
              (route: any) => route.id.toString() === studentBus.routeDetailsId.toString()
            );
          }
        }
      }

      const response = {
        ...studentClass?.toObject(),
        studentBus: studentBusData,
        transport: transportDetails,
        selectedRoute: routeDetails,
        // For backward compatibility, include the old fields
        isBusTaken: !!studentBus,
        busId: studentBus?.transportId?.toString(),
        routeId: studentBus?.routeDetailsId?.toString()
      };

      return NextResponse.json(response);
    } else if (getSectionsWithSubject === "true" && classId && subjectId) {
      // New functionality: Get sections that have students enrolled in a specific subject for a specific class
      const studentClasses = await StudentClass.find({
        class: classId,
        subjects: { $in: [subjectId] },
        isActive: true,
      })
        .populate("section")
        .select("section")
        .exec();

      // Extract unique sections
      const uniqueSections = studentClasses.reduce((acc: any[], studentClass: any) => {
        if (studentClass.section && !acc.find(sec => sec._id.toString() === studentClass.section._id.toString())) {
          acc.push(studentClass.section);
        }
        return acc;
      }, []);

      // Sort sections by name
      uniqueSections.sort((a, b) => a.section.localeCompare(b.section));

      return NextResponse.json({
        sections: uniqueSections,
        totalSections: uniqueSections.length
      });
    } else if (classId && sectionId && subjectId) {
      const studentClass = await StudentClass.find({
        class: classId,
        section: sectionId,
        subjects: { $in: [subjectId] },
        isActive: true,
      })
        .populate("class")
        .populate("section")
        .populate("studentId")
        .populate("subjects")
        .select("-__v");

      return NextResponse.json(studentClass);
    } else if (classId && sectionId) {
      const studentClass = await StudentClass.find({
        class: classId,
        section: sectionId,
        isActive: true,
      })
        .populate("class")
        .populate("section")
        .populate("studentId")
        .populate("subjects")
        .select("-__v");

      return NextResponse.json(studentClass);
    } else {
      const studentClasses = await StudentClass.find({
        isActive: true,
      })
        .populate("class")
        .populate("section")
        .populate("subjects")
        .select("-__v");

      return NextResponse.json(studentClasses);
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch student classes" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const studentId = searchParams.get("studentId");
    const data = await request.json();

    if (!id && !studentId) {
      return NextResponse.json(
        { error: "Either student class ID or studentId is required" },
        { status: 400 }
      );
    }

    // Find class and section by their IDs
    const classExists = await Class.findById(data.classId);
    const sectionExists = await Section.findById(data.sectionId);

    if (!classExists || !sectionExists) {
      return NextResponse.json(
        { error: "Invalid class or section" },
        { status: 400 }
      );
    }

    if (id) {
      const userData = await User.findByIdAndUpdate(id, {
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        modifiedDate: new Date(),
      });

      if (!userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get existing student class to access academicYearId
      const existingStudentClass = await StudentClass.findOne({
        studentId: id,
        isActive: true
      });

      // Handle transport updates for edit mode
      if (data.isBusTaken !== undefined) {
        if (data.isBusTaken && data.busId && data.routeId) {
          // Check if student already has transport and if details changed
          const existingStudentBus = await StudentBus.findOne({
            studentId: id,
            isActive: true
          });

          let requiresConsent = false;
          let changeDetails = null;

          if (existingStudentBus) {
            // Check if transport or route details changed
            const transportChanged = existingStudentBus.transportId.toString() !== data.busId;
            const routeChanged = existingStudentBus.routeDetailsId.toString() !== data.routeId;

            if (transportChanged || routeChanged) {
              requiresConsent = true;
              
              // Get current and new transport details for comparison
              const [currentTransport, newTransport] = await Promise.all([
                Transport.findById(existingStudentBus.transportId),
                Transport.findById(data.busId)
              ]);

              const currentRoute = currentTransport?.routeDetails?.find(
                (route: any) => route.id.toString() === existingStudentBus.routeDetailsId.toString()
              );
              const newRoute = newTransport?.routeDetails?.find(
                (route: any) => route.id.toString() === data.routeId
              );

              // Calculate pending installments
              const pendingInstallments = await StudentBusFee.countDocuments({
                studentId: id,
                isActive: true,
                status: { $in: ['not_started', 'pending', 'overdue'] }
              });

              changeDetails = {
                transportChanged,
                routeChanged,
                currentTransport: {
                  id: currentTransport?._id,
                  number: currentTransport?.number,
                  vehicleNumber: currentTransport?.vehicleNumber,
                  route: currentRoute
                },
                newTransport: {
                  id: newTransport?._id,
                  number: newTransport?.number,
                  vehicleNumber: newTransport?.vehicleNumber,
                  route: newRoute
                },
                pendingInstallments
              };

              // If consent is required but not provided, return change details
              if (!data.consentProvided) {
                return NextResponse.json({
                  requiresConsent: true,
                  changeDetails,
                  message: "Transport details have changed. Please confirm the changes."
                }, { status: 200 });
              }
            }
          }

          // Proceed with updates only if no consent required or consent provided
          if (!requiresConsent || data.consentProvided) {
            // Student wants transport - create or update bus fees
            // First, deactivate any existing bus fees and bus assignments for this student
            await StudentBusFee.updateMany(
              { studentId: id, isActive: true },
              { isActive: false, modifiedDate: new Date() }
            );
            await StudentBus.updateMany(
              { studentId: id, isActive: true },
              { isActive: false, modifiedDate: new Date() }
            );

            // Create new bus fees and assignments
            try {
              const transport = await Transport.findById(data.busId);
              if (transport) {
                const routeDetail = transport.routeDetails?.find(
                  (route: any) => route.id.toString() === data.routeId
                );
                
                if (routeDetail) {
                  // Calculate due dates similar to POST method
                  const currentDate = new Date();
                  const currentYear = currentDate.getFullYear();
                  const dueDates: Date[] = [];

                  switch (transport.installments) {
                    case 'monthly':
                      for (let i = 0; i < 12; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + i, 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case '3months':
                      for (let i = 0; i < 4; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 3), 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case '4months':
                      for (let i = 0; i < 3; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 4), 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case '6months':
                      for (let i = 0; i < 2; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 6), 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case 'yearly':
                      const dueDate = new Date(currentYear, currentDate.getMonth(), 1);
                      dueDates.push(dueDate);
                      break;
                    default:
                      for (let i = 0; i < 12; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + i, 1);
                        dueDates.push(dueDate);
                      }
                  }

                  // Create new student bus fee entries
                  for (let i = 0; i < dueDates.length; i++) {
                    const dueDate = dueDates[i];
                    let status = "not_started";
                    if (i === 0) {
                      status = dueDate < currentDate ? "overdue" : "pending";
                    } else {
                      status = "not_started";
                    }

                    await StudentBusFee.create({
                      studentId: id,
                      busId: data.busId,
                      routeDestination: routeDetail.destination, // Store the destination name for fee tracking
                      amount: routeDetail.amount,
                      dueDate: dueDate,
                      status: status,
                      isActive: true,
                      addedDate: new Date(),
                    });
                  }

                  // Create new StudentBus entry
                  await StudentBus.create({
                    studentId: id,
                    classId: data.classId,
                    sectionId: data.sectionId,
                    academicYearId: existingStudentClass?.academicYear || data.academicYearId,
                    transportId: data.busId,
                    routeDetailsId: new mongoose.Types.ObjectId(data.routeId),
                    isActive: true,
                    addedDate: new Date(),
                  });
                }
              }
            } catch (error) {
              console.error("Error updating student bus fees:", error);
            }
          }
        } else {
          // Student doesn't want transport - deactivate existing bus fees and bus assignments
          await StudentBusFee.updateMany(
            { studentId: id, isActive: true },
            { isActive: false, modifiedDate: new Date() }
          );
          await StudentBus.updateMany(
            { studentId: id, isActive: true },
            { isActive: false, modifiedDate: new Date() }
          );
        }
      }

      const studentClass = await StudentClass.findOneAndUpdate(
        { studentId: id, isActive: true },
        {
          class: data.classId,
          section: data.sectionId,
          subjects: data.subjectIds || [],
          isBusTaken: data.isBusTaken || false,
          busId: data.isBusTaken ? data.busId : undefined,
          routeId: data.isBusTaken ? data.routeId : undefined,
          modifiedDate: new Date(),
        },
        { new: true }
      )
        .populate("class")
        .populate("section");

      if (!studentClass) {
        return NextResponse.json(
          { error: "Student class not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(studentClass);
    } else if (studentId) {
      const userData = await User.findByIdAndUpdate(studentId, {
        firstName: data.firstName,
        lastName: data.lastName,
        address: data.address,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodGroup: data.bloodGroup,
        parentPhoneNumber: data.parentPhoneNumber,
        phoneNumber: data.phoneNumber,
        modifiedDate: new Date(),
      });

      if (!userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      // Get existing student class to access academicYearId
      const existingStudentClass = await StudentClass.findOne({
        studentId: studentId,
        isActive: true
      });

      // Handle transport updates for edit mode (studentId case)
      if (data.isBusTaken !== undefined) {
        if (data.isBusTaken && data.busId && data.routeId) {
          // Check if student already has transport and if details changed
          const existingStudentBus = await StudentBus.findOne({
            studentId: studentId,
            isActive: true
          });

          let requiresConsent = false;
          let changeDetails = null;

          if (existingStudentBus) {
            // Check if transport or route details changed
            const transportChanged = existingStudentBus.transportId.toString() !== data.busId;
            const routeChanged = existingStudentBus.routeDetailsId.toString() !== data.routeId;

            if (transportChanged || routeChanged) {
              requiresConsent = true;
              
              // Get current and new transport details for comparison
              const [currentTransport, newTransport] = await Promise.all([
                Transport.findById(existingStudentBus.transportId),
                Transport.findById(data.busId)
              ]);

              const currentRoute = currentTransport?.routeDetails?.find(
                (route: any) => route.id.toString() === existingStudentBus.routeDetailsId.toString()
              );
              const newRoute = newTransport?.routeDetails?.find(
                (route: any) => route.id.toString() === data.routeId
              );

              // Calculate pending installments
              const pendingInstallments = await StudentBusFee.countDocuments({
                studentId: studentId,
                isActive: true,
                status: { $in: ['not_started', 'pending', 'overdue'] }
              });

              changeDetails = {
                transportChanged,
                routeChanged,
                currentTransport: {
                  id: currentTransport?._id,
                  number: currentTransport?.number,
                  vehicleNumber: currentTransport?.vehicleNumber,
                  route: currentRoute
                },
                newTransport: {
                  id: newTransport?._id,
                  number: newTransport?.number,
                  vehicleNumber: newTransport?.vehicleNumber,
                  route: newRoute
                },
                pendingInstallments
              };

              // If consent is required but not provided, return change details
              if (!data.consentProvided) {
                return NextResponse.json({
                  requiresConsent: true,
                  changeDetails,
                  message: "Transport details have changed. Please confirm the changes."
                }, { status: 200 });
              }
            }
          }

          // Proceed with updates only if no consent required or consent provided
          if (!requiresConsent || data.consentProvided) {
            // Student wants transport - create or update bus fees
            await StudentBusFee.updateMany(
              { studentId: studentId, isActive: true },
              { isActive: false, modifiedDate: new Date() }
            );
            await StudentBus.updateMany(
              { studentId: studentId, isActive: true },
              { isActive: false, modifiedDate: new Date() }
            );

            // Create new bus fees and assignments
            try {
              const transport = await Transport.findById(data.busId);
              if (transport) {
                const routeDetail = transport.routeDetails?.find(
                  (route: any) => route.id.toString() === data.routeId
                );
                
                if (routeDetail) {
                  const currentDate = new Date();
                  const currentYear = currentDate.getFullYear();
                  const dueDates: Date[] = [];

                  switch (transport.installments) {
                    case 'monthly':
                      for (let i = 0; i < 12; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + i, 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case '3months':
                      for (let i = 0; i < 4; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 3), 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case '4months':
                      for (let i = 0; i < 3; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 4), 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case '6months':
                      for (let i = 0; i < 2; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + (i * 6), 1);
                        dueDates.push(dueDate);
                      }
                      break;
                    case 'yearly':
                      const dueDate = new Date(currentYear, currentDate.getMonth(), 1);
                      dueDates.push(dueDate);
                      break;
                    default:
                      for (let i = 0; i < 12; i++) {
                        const dueDate = new Date(currentYear, currentDate.getMonth() + i, 1);
                        dueDates.push(dueDate);
                      }
                  }

                  // Create new StudentBus entry first
                  const newStudentBus = await StudentBus.create({
                    studentId: studentId,
                    classId: data.classId,
                    sectionId: data.sectionId,
                    academicYearId: existingStudentClass?.academicYear || data.academicYearId,
                    transportId: data.busId,
                    routeDetailsId: new mongoose.Types.ObjectId(data.routeId),
                    isActive: true,
                    addedDate: new Date(),
                  });

                  for (let i = 0; i < dueDates.length; i++) {
                    const dueDate = dueDates[i];
                    let status = "not_started";
                    if (i === 0) {
                      status = dueDate < currentDate ? "overdue" : "pending";
                    } else {
                      status = "not_started";
                    }

                    await StudentBusFee.create({
                      studentId: studentId,
                      studentBusId: newStudentBus._id, // Use the created StudentBus ID
                      routeDestination: routeDetail.destination, // Store the destination name for fee tracking
                      amount: routeDetail.amount,
                      dueDate: dueDate,
                      status: status,
                      isActive: true,
                      addedDate: new Date(),
                    });
                  }
                }
              }
            } catch (error) {
              console.error("Error updating student bus fees:", error);
            }
          }
        } else {
          // Student doesn't want transport - deactivate existing bus fees and bus assignments
          await StudentBusFee.updateMany(
            { studentId: studentId, isActive: true },
            { isActive: false, modifiedDate: new Date() }
          );
          await StudentBus.updateMany(
            { studentId: studentId, isActive: true },
            { isActive: false, modifiedDate: new Date() }
          );
        }
      }

      const studentClass = await StudentClass.findOneAndUpdate(
        { studentId: studentId, isActive: true },
        {
          class: data.classId,
          section: data.sectionId,
          subjects: data.subjectIds || [],
          isBusTaken: data.isBusTaken || false,
          modifiedDate: new Date(),
        },
        { new: true }
      )
        .populate("class")
        .populate("section");

      if (!studentClass) {
        return NextResponse.json(
          { error: "Student class not found" },
          { status: 404 }
        );
      }

      return NextResponse.json(studentClass);
    }
  } catch (error) { 
    return NextResponse.json(
      { error: "Failed to update student class" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const studentClass = await StudentClass.findOneAndUpdate({ studentId: id}, {
      isActive: false,
    });
    if (studentClass) {
      const user = await User.findByIdAndUpdate(studentClass.studentId, {
        isActive: false,
      });
      if (!user) {
        return NextResponse.json(
          { error: "Failed to delete user" },
          { status: 500 }
        );
      } else {
        return NextResponse.json({ user }, { status: 201 });
      }
    } else {
      return NextResponse.json(
        { message: "student class not found to delete" },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json({ error: "No entry selected" }, { status: 500 });
  }
}
