import dbConnect from "@/lib/mongodb";
import Course from "../models/course";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Class } from "../models/class";
import { UserJwtPayload } from "@/lib/auth";
import jwt from "jsonwebtoken";
import { UserRole } from "@/lib/role";
import StudentClass from "../models/studentClass";
import toast from "react-hot-toast";
import Exam from "../models/exam";
import SeatingArrangement from "../models/seatingArrangement";
import Room from "../models/rooms";
import RoomSeatingPlan from "../models/roomSeatingPlan";

// Helper function to get shared classes
const getSharedClass = (classNumber: number) => {
  if (classNumber >= 1 && classNumber <= 2) {
    return [1, 2];
  }
  if (classNumber >= 3 && classNumber <= 4) {
    return [3, 4];
  }
  if (classNumber >= 5 && classNumber <= 6) {
    return [5, 6];
  }
  if (classNumber >= 7 && classNumber <= 8) {
    return [7, 8];
  }
  if (classNumber >= 9 && classNumber <= 10) {
    return [9, 10];
  }
  if (classNumber >= 11 && classNumber <= 12) {
    return [11, 12];
  }
  return [];
};

// Helper function to determine position based on class number in shared classes
const getPositionInRoom = (classNumber: number) => {
  const sharedClasses = getSharedClass(classNumber);
  if (sharedClasses.length <= 1) {
    return 'M'; // Middle if no sharing
  }
  
  const minClass = Math.min(...sharedClasses);
  const maxClass = Math.max(...sharedClasses);
  
  if (classNumber === minClass) {
    return 'L'; // Left for smallest class number
  } else if (classNumber === maxClass) {
    return 'R'; // Right for largest class number
  } else {
    return 'M'; // Middle for others
  }
};

// Helper function to generate seating plan entries
function generateSeatingPlanEntries(roomLayout: any[], rollNumbers: number[], position: string, classNumber: string, section: string, startFromRow: number = 1, startFromBench: number = 1) {
  const seatingPlanEntries = [];
  let rollNumberIndex = 0;
  let started = false;

  // Iterate through room layout (rows and benches)
  for (let rowIndex = 0; rowIndex < roomLayout.length; rowIndex++) {
    const layoutRow = roomLayout[rowIndex];
    const rowNumber = layoutRow.row;
    const benchesInRow = layoutRow.benches;

    // Skip rows that are before our starting point
    if (rowNumber < startFromRow) {
      continue;
    }

    // Iterate through benches in this row
    for (let benchIndex = 1; benchIndex <= benchesInRow; benchIndex++) {
      // Skip benches before our starting point in the starting row
      if (rowNumber === startFromRow && benchIndex < startFromBench) {
        continue;
      }

      // Check if we still have roll numbers to assign
      if (rollNumberIndex < rollNumbers.length) {
        seatingPlanEntries.push({
          row: rowNumber,
          bench: benchIndex,
          position: position,
          rollNumber: rollNumbers[rollNumberIndex],
          classNumber: classNumber,
          section: section
        });
        rollNumberIndex++;
      } else {
        // No more students to assign
        break;
      }
    }

    // Break outer loop if all students are assigned
    if (rollNumberIndex >= rollNumbers.length) {
      break;
    }
  }

  return seatingPlanEntries;
}

// Helper function to find the last used position for the same class in existing seating plan
function findLastUsedPosition(existingSeatingPlan: any[], classNumber: string, position: string) {
  if (!existingSeatingPlan || existingSeatingPlan.length === 0) {
    return { lastRow: 1, lastBench: 0 }; // Start from beginning
  }

  // Filter entries for the same class and same position (same side of bench)
  const sameClassSamePositionEntries = existingSeatingPlan.filter(entry => 
    entry.classNumber === classNumber && entry.position === position
  );

  // If no entries for same class and position exist, start from beginning
  if (sameClassSamePositionEntries.length === 0) {
    return { lastRow: 1, lastBench: 0 };
  }

  let maxRow = 0;
  let maxBenchInMaxRow = 0;

  sameClassSamePositionEntries.forEach(entry => {
    if (entry.row > maxRow) {
      maxRow = entry.row;
      maxBenchInMaxRow = entry.bench;
    } else if (entry.row === maxRow && entry.bench > maxBenchInMaxRow) {
      maxBenchInMaxRow = entry.bench;
    }
  });

  return { lastRow: maxRow, lastBench: maxBenchInMaxRow };
}

// Helper function to validate no seat conflicts exist
function validateSeatingConflicts(existingSeatingPlan: any[], newSeatingPlanEntries: any[]) {
  const conflicts = [];
  
  for (const newEntry of newSeatingPlanEntries) {
    const conflict = existingSeatingPlan.find(existingEntry => 
      existingEntry.row === newEntry.row && 
      existingEntry.bench === newEntry.bench && 
      existingEntry.position === newEntry.position
    );
    
    if (conflict) {
      conflicts.push({
        position: `Row ${newEntry.row}, Bench ${newEntry.bench}, Position ${newEntry.position}`,
        existingStudent: `Class ${conflict.classNumber}${conflict.section} - Roll ${conflict.rollNumber}`,
        newStudent: `Class ${newEntry.classNumber}${newEntry.section} - Roll ${newEntry.rollNumber}`
      });
    }
  }
  
  return conflicts;
}

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const { examId, classNumber, examDate, benchCapacity } = await req.json();
    
    // Validate required fields
    if (!examId || !classNumber || !examDate || !benchCapacity) {
      return NextResponse.json(
        { error: "Missing required fields: examId, classNumber, examDate, and benchCapacity are required" },
        { status: 400 }
      );
    }

    // Step 1: First verify the exam exists and matches the provided examDate
    const exam = await Exam.findById(examId);
    if (!exam) {
      return NextResponse.json(
        { error: "Exam not found" },
        { status: 404 }
      );
    }

    const seatingArrangements = await SeatingArrangement.find({examId: examId, isActive: true}).populate('sectionId');


    if (!seatingArrangements || seatingArrangements.length === 0) {
      return NextResponse.json(
        { error: "No seating arrangement found for this exam" },
        { status: 404 }
      );
    }

    // const classNumber = classInfo.classNumber;
    const position = getPositionInRoom(classNumber);

    // Step 3: Process each seating arrangement
    const roomSeatingPlans = [];

    for (const seatingArrangement of seatingArrangements) {
      for (const venue of seatingArrangement.venueDetails as any[]) {
        // Step 4: Get room details with layout
        const room = await Room.findById(venue.roomId);
        if (!room || !room.layout || room.layout.length === 0) {
          continue; // Skip rooms without valid layout
        }

        // Step 5: Check if seating plan already exists for this room and exam date
        const existingPlan = await RoomSeatingPlan.findOne({
          roomId: venue.roomId,
          examDate: new Date(examDate),
          isActive: true
        });

        if (existingPlan) {
          // Update existing plan by adding this seating arrangement
          if (!existingPlan.seatingArrangementId.includes(seatingArrangement._id)) {
            
            // Check if there are existing students from the same class in this room
            const existingSameClassEntries = existingPlan.seatingPlan.filter((entry: any) => 
              entry.classNumber === classNumber.toString()
            );
            
            // If same class exists, check if they're using the same position (same side)
            const existingSameClassSamePosition = existingSameClassEntries.filter((entry: any) =>
              entry.position === position
            );
            
            if (existingSameClassSamePosition.length > 0) {
              // Same class already using this position - find next available position after them
              const { lastRow, lastBench } = findLastUsedPosition(existingPlan.seatingPlan, classNumber.toString(), position);
              
              // Calculate next starting position
              let nextRow = lastRow;
              let nextBench = lastBench + 1;
              
              // Find the row layout for the last used row
              const lastRowLayout = room.layout.find((row: any) => row.row === lastRow);
              if (lastRowLayout && nextBench > lastRowLayout.benches) {
                // Move to next row if we exceeded benches in current row
                nextRow = lastRow + 1;
                nextBench = 1;
              }
              
              // Add new seating plan entries starting from the next available position
              const newSeatingPlanEntries = generateSeatingPlanEntries(
                room.layout,
                venue.rollNumbers,
                position,
                classNumber.toString(),
                seatingArrangement.sectionId.section,
                nextRow,
                nextBench
              );
              
              // Validate no conflicts before adding
              const conflicts = validateSeatingConflicts(existingPlan.seatingPlan, newSeatingPlanEntries);
              if (conflicts.length > 0) {
                return NextResponse.json(
                  { 
                    error: "Seating conflicts detected", 
                    conflicts: conflicts,
                    room: room.room 
                  },
                  { status: 400 }
                );
              }
              
              existingPlan.seatingPlan.push(...newSeatingPlanEntries);
            } else {
              // Different class exists OR same class but different position - start from beginning with current position
              const newSeatingPlanEntries = generateSeatingPlanEntries(
                room.layout,
                venue.rollNumbers,
                position,
                classNumber.toString(),
                seatingArrangement.sectionId.section
              );
              
              // Validate no conflicts before adding
              const conflicts = validateSeatingConflicts(existingPlan.seatingPlan, newSeatingPlanEntries);
              if (conflicts.length > 0) {
                return NextResponse.json(
                  { 
                    error: "Seating conflicts detected", 
                    conflicts: conflicts,
                    room: room.room 
                  },
                  { status: 400 }
                );
              }
              
              existingPlan.seatingPlan.push(...newSeatingPlanEntries);
            }
            
            existingPlan.seatingArrangementId.push(seatingArrangement._id);
            await existingPlan.save();
            roomSeatingPlans.push(existingPlan);
          }
        } else {
          // Step 6: Generate seating plan entries
          const seatingPlanEntries = generateSeatingPlanEntries(
            room.layout,
            venue.rollNumbers,
            position,
            classNumber.toString(),
            seatingArrangement.sectionId.section
          );

          // Step 7: Create new room seating plan
          const roomSeatingPlan = await RoomSeatingPlan.create({
            roomId: venue.roomId,
            seatingArrangementId: [seatingArrangement._id],
            examDate: new Date(examDate),
            seatingPlan: seatingPlanEntries,
            benchCapacity: benchCapacity,
            isActive: true
          });

          roomSeatingPlans.push(roomSeatingPlan);
        }
      }
    }

    return NextResponse.json({
      message: "Seating plans created successfully",
      roomSeatingPlans: roomSeatingPlans,
      totalRooms: roomSeatingPlans.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create seating plan", message: error },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const examDate = searchParams.get("examDate");
    const roomId = searchParams.get("roomId");
    const examId = searchParams.get("examId");
    const sectionId = searchParams.get("sectionId");

    // Get specific room seating plan for visualization
    if (examDate && roomId) {
      const seatingPlan = await RoomSeatingPlan.findOne({
        roomId: roomId,
        examDate: new Date(examDate),
        isActive: true
      })
        .populate('roomId', 'room layout capacity')
        .populate('seatingArrangementId')
        .populate('seatingPlan.classNumber', 'classNumber')
        .populate('seatingPlan.section', 'section');

      if (!seatingPlan) {
        return NextResponse.json(
          { error: "No seating plan found for this room and date" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        seatingPlan: seatingPlan,
        totalStudents: seatingPlan.seatingPlan.length,
        room: seatingPlan.roomId
      });
    }

    // Get all seating plans for a specific exam date
    if (examDate) {
      const seatingPlans = await RoomSeatingPlan.find({
        examDate: new Date(examDate),
        isActive: true
      })
        .populate('roomId', 'room layout capacity entry')
        .populate('seatingArrangementId')
        .populate('seatingPlan.classNumber', 'classNumber')
        .populate('seatingPlan.section', 'section');

      return NextResponse.json({
        seatingPlans: seatingPlans,
        totalRooms: seatingPlans.length
      });
    }

    // Get seating plan by exam and section (for checking if already exists)
    if (examId && sectionId) {
      const seatingArrangement = await SeatingArrangement.findOne({
        examId: examId,
        sectionId: sectionId,
        isActive: true
      });

      if (!seatingArrangement) {
        return NextResponse.json(
          { error: "No seating arrangement found" },
          { status: 404 }
        );
      }

      const roomIds = seatingArrangement.venueDetails.map((venue: any) => venue.roomId);
      
      const seatingPlans = await RoomSeatingPlan.find({
        roomId: { $in: roomIds },
        seatingArrangementId: seatingArrangement._id,
        isActive: true
      })
        .populate('roomId', 'room layout capacity')
        .populate('seatingArrangementId');

      return NextResponse.json({
        seatingPlans: seatingPlans,
        seatingArrangement: seatingArrangement,
        exists: seatingPlans.length > 0
      });
    }

    return NextResponse.json(
      { error: "Required parameters missing: examDate and roomId, or examDate alone, or examId and sectionId" },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch seating plan", message: error },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const data = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Seating plan ID is required" },
        { status: 400 }
      );
    }

    const updatedSeatingPlan = await RoomSeatingPlan.findByIdAndUpdate(
      id,
      {
        seatingPlan: data.seatingPlan,
        modifiedDate: new Date(),
      },
      { new: true }
    )
      .populate('roomId', 'room layout capacity')
      .populate('seatingPlan.classNumber', 'classNumber')
      .populate('seatingPlan.section', 'section');

    if (!updatedSeatingPlan) {
      return NextResponse.json(
        { error: "Seating plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSeatingPlan);

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update seating plan", message: error },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json(
        { error: "Seating plan ID is required" },
        { status: 400 }
      );
    }

    const seatingPlan = await RoomSeatingPlan.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!seatingPlan) {
      return NextResponse.json(
        { error: "Seating plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Seating plan deleted successfully",
      seatingPlan: seatingPlan
    });

  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete seating plan", message: error },
      { status: 500 }
    );
  }
}
