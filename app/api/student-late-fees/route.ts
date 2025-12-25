import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StudentLateFee from '@/app/api/models/studentLateFee';

export async function GET(request: NextRequest) {
    try {
        await dbConnect();

        const { searchParams } = new URL(request.url);
        const studentFeeId = searchParams.get('studentFeeId');
        const studentId = searchParams.get('studentId');

        let query: any = {};

        // Filter by studentFeeId if provided
        if (studentFeeId) {
            query.studentFeeId = studentFeeId;
        }

        // Filter by studentId if provided
        if (studentId) {
            query.studentId = studentId;
        }

        const lateFees = await StudentLateFee.find(query)
            .populate({
                path: 'studentId',
                select: 'firstName lastName email'
            })
            .populate({
                path: 'studentFeeId',
                select: 'dueDate status'
            })
            .sort({ appliedOn: -1 }); // Most recent first

        return NextResponse.json(lateFees, { status: 200 });

    } catch (error) {
        console.error('Error fetching student late fees:', error);
        return NextResponse.json(
            { error: 'Failed to fetch student late fees', message: error },
            { status: 500 }
        );
    }
}
