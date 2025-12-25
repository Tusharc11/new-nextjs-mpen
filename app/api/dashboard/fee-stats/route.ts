import dbConnect from "@/lib/mongodb";
import StudentFeePayment from "../../models/studentFeePayment";
import StudentFee from "../../models/studentFee";
import StudentLateFee from "../../models/studentLateFee";
import FeesStructure from "../../models/feesStructure";
import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const academicYearId = searchParams.get("academicYearId");

    // Get token for client organization
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clientOrganizationId = token.clientOrganizationId;

    if (!academicYearId) {
      return NextResponse.json(
        { error: "Academic year ID is required" },
        { status: 400 }
      );
    }

    // Get all fee structures for the academic year and organization
    const feeStructures = await FeesStructure.find({
      academicYearId: academicYearId,
      clientOrganizationId: clientOrganizationId,
      isActive: true
    }).select('_id');

    if (feeStructures.length === 0) {
      return NextResponse.json({
        totalCollected: 0,
        totalDue: 0,
        totalOutstanding: 0,
        collectionPercentage: 0,
        collectionStatus: 'poor',
        paymentModeBreakdown: {},
        monthlyTrends: [],
        academicYearId
      });
    }

    // Get all student fee payments for these fee structures
    const feeStructureIds = feeStructures.map(fs => fs._id);
    const payments = await StudentFeePayment.aggregate([
      {
        $match: {
          feesStructureId: { $in: feeStructureIds },
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" },
          paymentsByMode: {
            $push: {
              mode: "$mode",
              amount: "$amount",
              paidOn: "$paidOn"
            }
          }
        }
      }
    ]);

    // Calculate payment mode breakdown
    let paymentModeBreakdown: { [key: string]: number } = {};
    let monthlyTrends: { [key: string]: number } = {};
    
    if (payments.length > 0 && payments[0].paymentsByMode) {
      payments[0].paymentsByMode.forEach((payment: any) => {
        // Mode breakdown
        if (!paymentModeBreakdown[payment.mode]) {
          paymentModeBreakdown[payment.mode] = 0;
        }
        paymentModeBreakdown[payment.mode] += payment.amount;

        // Monthly trends
        const month = new Date(payment.paidOn).toLocaleString('default', { month: 'short' });
        if (!monthlyTrends[month]) {
          monthlyTrends[month] = 0;
        }
        monthlyTrends[month] += payment.amount;
      });
    }

    // Calculate total due and outstanding using the same logic as outstanding-fees API
    // This fixes the issue where totalDue was missing late fees
    // 
    // Correct calculations:
    // Total Due = Base Fees + Late Fees (what should be collected including penalties)
    // Total Collected = All payments made
    // Outstanding = Total Due - Total Collected (what remains to be paid)
    // Collection Rate = (Total Collected ÷ Total Due) × 100

    // Get all student fees with payments and late fees (same as outstanding-fees API)
    const studentFeesData = await StudentFee.aggregate([
      {
        $match: {
          feesStructureId: { $in: feeStructureIds },
          isActive: true,
          status: { $ne: 'paid' } // Only include records that are not marked as paid
        }
      },
      {
        $lookup: {
          from: "studentfeepayments",
          localField: "_id",
          foreignField: "studentFeeId",
          as: "payments"
        }
      },
      {
        $lookup: {
          from: "feesstructures",
          localField: "feesStructureId",
          foreignField: "_id",
          as: "feeStructure"
        }
      },
      {
        $lookup: {
          from: "studentlatefees",
          let: { studentFeeId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$studentFeeId", "$$studentFeeId"]
                }
              }
            }
          ],
          as: "lateFees"
        }
      },
      {
        $addFields: {
          totalPaid: {
            $sum: {
              $map: {
                input: { $filter: { input: "$payments", cond: { $eq: ["$$this.isActive", true] } } },
                as: "payment",
                in: "$$payment.amount"
              }
            }
          },
          totalLateFees: {
            $sum: {
              $map: {
                input: { $filter: { input: "$lateFees", cond: { $ne: ["$$this.isWaived", true] } } },
                as: "lateFee",
                in: "$$lateFee.lateFeeAmount"
              }
            }
          },
          feeAmount: { $arrayElemAt: ["$feeStructure.totalAmount", 0] }
        }
      },
      {
        $addFields: {
          totalOwed: { $add: ["$feeAmount", "$totalLateFees"] },
          outstandingAmount: {
            $subtract: [
              { $add: ["$feeAmount", "$totalLateFees"] },
              "$totalPaid"
            ]
          }
        }
      }
    ]);

    // Calculate totals from unpaid fee records (filtered by status != 'paid')
    let totalDue = 0;
    let totalOutstanding = 0;
    const totalCollected = payments.length > 0 ? payments[0].totalCollected : 0;

    studentFeesData.forEach(fee => {
      totalDue += fee.totalOwed || 0;
      totalOutstanding += fee.outstandingAmount || 0;
    });
    
    // Collection Rate/Percentage = (Total Collected ÷ Total Due) × 100
    // This shows fee recovery efficiency:
    // 90-100% = Excellent (almost all fees collected)
    // 70-89% = Good (decent collection rate)
    // <70% = Poor (needs immediate follow-up)
    const collectionPercentage = totalDue > 0 ? Number(((totalCollected / totalDue) * 100).toFixed(2)) : 0;
    // Calculate collection efficiency status
    const collectionStatus = collectionPercentage >= 90 
      ? 'excellent' 
      : collectionPercentage >= 70 
      ? 'good' 
      : 'poor';

    // Format monthly trends for the last 6 months
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const monthName = monthOrder[monthIndex];
      last6Months.push({
        month: monthName,
        amount: monthlyTrends[monthName] || 0
      });
    }

    return NextResponse.json({
      totalCollected,
      totalDue,
      totalOutstanding: Math.round(totalOutstanding), // Apply same rounding as outstanding-fees API
      collectionPercentage,
      collectionStatus,
      paymentModeBreakdown,
      monthlyTrends: last6Months,
      academicYearId
    });

  } catch (error) {
    console.error("Error fetching fee statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch fee statistics" },
      { status: 500 }
    );
  }
}
