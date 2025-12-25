import dbConnect from "@/lib/mongodb";
import Announcement from "@/app/api/models/announcement";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { UserJwtPayload } from "@/lib/auth";
import { whatsappService } from "@/lib/whatsapp";
import User from "@/app/api/models/user";

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

    const data = await request.json();

    // Validate required fields
    if (!data.message || !data.messageType) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: message and messageType are required",
        },
        { status: 400 }
      );
    }

    // Create the announcement with required fields
    const announcement = await Announcement.create({
      content: data.message,
      messageType: data.messageType,
      groupType: data.groupType,
      clientOrganizationId: clientOrganizationId,
      senderId: data.senderId,
      isActive: true,
      addedDate: new Date(),
    });

    let whatsappResult = null;

    // Only send WhatsApp notification if the flag is set to true
    if (data.sendToWhatsApp === true) {
      try {
        // Get sender information for WhatsApp notification
        const sender = await User.findById(data.senderId).where({
          clientOrganizationId: clientOrganizationId,
        });
        const senderName = sender
          ? `${sender.firstName} ${sender.lastName}`
          : "Unknown";

        // Determine template name based on message type
        let templateName = "";
        switch (data.messageType) {
          case "alert":
            templateName = "alert";
            break;
          case "reminder":
            templateName = "reminder";
            break;
          case "announcement":
          default:
            templateName = "announcement";
            break;
        }

        const whatsappNumber = process.env.TEST_WHATSAPP_NUMBER;

        if (!whatsappNumber) {
          whatsappResult = false;
        } else {
          // Prepare template parameters
          const templateParameters = {
            first_name: sender?.firstName || "User",
            last_name: sender?.lastName || "",
            content: data.message,
            sender_name: senderName
          };

          whatsappResult = await whatsappService.sendParameterizedTemplateMessage(
            whatsappNumber,
            templateParameters
          );
        }
        
      } catch (whatsappError) {
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Announcement created successfully",
        announcementId: announcement._id,
        whatsappResult: whatsappResult,
        data: {
          id: announcement._id,
          content: announcement.content,
          senderId: announcement.senderId,
          type: announcement.messageType,
          createdAt: announcement.addedDate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create announcement" },
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

    const announcements = await Announcement.find({
      clientOrganizationId: clientOrganizationId,
    })
      .populate("senderId")
      .sort({ addedDate: -1 });

    return NextResponse.json(announcements);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch announcements" },
      { status: 500 }
    );
  }
}
