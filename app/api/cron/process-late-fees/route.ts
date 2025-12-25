import { NextRequest, NextResponse } from 'next/server';
import StudentFee from '@/app/api/models/studentFee';
import StudentLateFee from '@/app/api/models/studentLateFee';
import LateFee from '@/app/api/models/lateFee';
import FeesStructure from '@/app/api/models/feesStructure';
import dbConnect from '@/lib/mongodb';
import "@/app/api/models/user";
import "@/app/api/models/feesStructure";
import "@/app/api/models/class";

export async function POST(request: NextRequest) {
    try {
        // Authentication is handled by middleware for cron routes
        await dbConnect();

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison

        // Find all student fees that are overdue but not yet marked as overdue
        const overdueStudentFees = await StudentFee.find({
            dueDate: { $lt: today }, // Due date is before today
            status: { $in: ['not_started', 'pending'] }, // Not paid and not already marked as overdue
            isActive: true
        }).populate([
            {
                path: 'studentId',
                select: 'firstName lastName email'
            },
            {
                path: 'feesStructureId',
                select: 'classId academicYearId term totalAmount',
                populate: {
                    path: 'classId',
                    select: 'classNumber'
                }
            }
        ]);

        let processedCount = 0;
        let errorCount = 0;

        for (const studentFee of overdueStudentFees) {
            try {
                const student = studentFee.studentId;
                const feesStructure = studentFee.feesStructureId;
                
                if (!student || !feesStructure) {
                    console.error(`Missing student or fees structure for studentFee: ${studentFee._id}`);
                    errorCount++;
                    continue;
                }

                // Find applicable late fee for this student's class and academic year
                const lateFee = await LateFee.findOne({
                    classId: { $in: [feesStructure.classId._id] },
                    academicYearId: feesStructure.academicYearId,
                    isActive: true
                });

                if (!lateFee) {
                    // Still update status to overdue even if no late fee amount is defined
                    await StudentFee.findByIdAndUpdate(
                        studentFee._id,
                        { 
                            status: 'overdue',
                            modifiedDate: new Date()
                        }
                    );
                    processedCount++;
                    continue;
                }

                // Check if late fee already exists for this student fee
                const existingLateFee = await StudentLateFee.findOne({
                    studentId: student._id,
                    studentFeeId: studentFee._id
                });

                if (existingLateFee) {
                    // Just update the status if not already overdue
                    await StudentFee.findByIdAndUpdate(
                        studentFee._id,
                        { 
                            status: 'overdue',
                            modifiedDate: new Date()
                        }
                    );
                    processedCount++;
                    continue;
                }

                // Calculate days overdue for reason
                const daysOverdue = Math.ceil((today.getTime() - studentFee.dueDate.getTime()) / (1000 * 60 * 60 * 24));

                // Create new late fee entry
                const newStudentLateFee = new StudentLateFee({
                    studentId: student._id,
                    studentFeeId: studentFee._id,
                    lateFeeAmount: lateFee.amount,
                    appliedOn: today,
                    isWaived: false,
                    addedDate: new Date(),
                    modifiedDate: new Date()
                });

                await newStudentLateFee.save();

                // Update student fee status to overdue
                await StudentFee.findByIdAndUpdate(
                    studentFee._id,
                    { 
                        status: 'overdue',
                        modifiedDate: new Date()
                    }
                );

                processedCount++;

            } catch (error) {
                console.error(`Error processing late fee for studentFee ${studentFee._id}:`, error);
                errorCount++;
            }
        }

        const result = {
            success: true,
            message: `Late fee processing completed`,
            processedDate: today.toISOString(),
            totalOverdueFees: overdueStudentFees.length,
            successfullyProcessed: processedCount,
            errors: errorCount,
            summary: {
                newLateFees: processedCount,
                statusUpdates: processedCount
            }
        };

        return NextResponse.json(result, { status: 200 });

    } catch (error) {
        return NextResponse.json(
            { 
                success: false, 
                error: 'Failed to process late fees',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, 
            { status: 500 }
        );
    }
}

// GET method for manual testing
export async function GET(request: NextRequest) {
    // You can call this endpoint manually for testing
    return POST(request);
} 