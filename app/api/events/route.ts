import dbConnect from "@/lib/mongodb";
import Event from "@/app/api/models/events";
import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { UserJwtPayload } from "@/lib/auth";

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

// GET - Fetch all events
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query: any = {
      clientOrganizationId: clientOrganizationId,
    };

    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.startDate = { $lte: new Date(endDate) };
    }

    const events = await Event.find(query)
      .populate("createdBy", "firstName lastName email")
      .sort({ startDate: 1 });

    return NextResponse.json({
      success: true,
      data: events,
      count: events.length
    });
  } catch (error) {
    console.error("Error fetching events:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

// POST - Create a new event
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;
    const userId = token.id;

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.summary || !data.startDate) {
      return NextResponse.json(
        {
          error: "Missing required fields: name, summary, and startDate are required",
        },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(data.startDate);
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid start date format" },
        { status: 400 }
      );
    }

    let endDate = null;
    if (data.endDate) {
      endDate = new Date(data.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid end date format" },
          { status: 400 }
        );
      }
      if (endDate < startDate) {
        return NextResponse.json(
          { error: "End date cannot be before start date" },
          { status: 400 }
        );
      }
    }

    // Create the event
    const eventData: any = {
      name: data.name.trim(),
      summary: data.summary.trim(),
      startDate: startDate,
      createdBy: userId,
      clientOrganizationId: clientOrganizationId,
      isActive: true,
      addedDate: new Date(),
    };

    if (data.details) {
      eventData.details = data.details.trim();
    }

    if (data.photo1) {
      eventData.photo1 = data.photo1.trim();
    }

    if (data.photo2) {
      eventData.photo2 = data.photo2.trim();
    }

    if (data.photo3) {
      eventData.photo3 = data.photo3.trim();
    }

    if (endDate) {
      eventData.endDate = endDate;
    }

    const event = await Event.create(eventData);

    // Populate the createdBy field for response
    await event.populate("createdBy");

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully",
        data: {
          id: event._id,
          name: event.name,
          summary: event.summary,
          details: event.details,
          photo1: event.photo1,
          photo2: event.photo2,
          photo3: event.photo3,
          startDate: event.startDate,
          endDate: event.endDate,
          createdBy: event.createdBy,
          createdAt: event.addedDate,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating event:", error);
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

// PUT - Update an existing event
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;

    const data = await request.json();

    // Validate required fields
    if (!data.id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Find the event
    const existingEvent = await Event.findOne({
      _id: data.id,
      clientOrganizationId: clientOrganizationId,
    });

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      modifiedDate: new Date(),
    };

    if (data.name) {
      updateData.name = data.name.trim();
    }

    if (data.summary) {
      updateData.summary = data.summary.trim();
    }

    if (data.details !== undefined) {
      updateData.details = data.details ? data.details.trim() : null;
    }

    if (data.photo1 !== undefined) {
      updateData.photo1 = data.photo1 ? data.photo1.trim() : null;
    }

    if (data.photo2 !== undefined) {
      updateData.photo2 = data.photo2 ? data.photo2.trim() : null;
    }

    if (data.photo3 !== undefined) {
      updateData.photo3 = data.photo3 ? data.photo3.trim() : null;
    }

    if (data.startDate) {
      const startDate = new Date(data.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date format" },
          { status: 400 }
        );
      }
      updateData.startDate = startDate;
    }

    if (data.endDate !== undefined) {
      if (data.endDate) {
        const endDate = new Date(data.endDate);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid end date format" },
            { status: 400 }
          );
        }
        const startDate = updateData.startDate || existingEvent.startDate;
        if (endDate < startDate) {
          return NextResponse.json(
            { error: "End date cannot be before start date" },
            { status: 400 }
          );
        }
        updateData.endDate = endDate;
      } else {
        updateData.endDate = null;
      }
    }

    if (data.isActive !== undefined) {
      updateData.isActive = Boolean(data.isActive);
    }

    // Update the event
    const updatedEvent = await Event.findByIdAndUpdate(
      data.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("createdBy", "firstName lastName email");

    if (!updatedEvent) {
      return NextResponse.json(
        { error: "Failed to update event" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event updated successfully",
      data: {
        id: updatedEvent._id,
        name: updatedEvent.name,
        summary: updatedEvent.summary,
        details: updatedEvent.details,
        photo1: updatedEvent.photo1,
        photo2: updatedEvent.photo2,
        photo3: updatedEvent.photo3,
        startDate: updatedEvent.startDate,
        endDate: updatedEvent.endDate,
        createdBy: updatedEvent.createdBy,
        isActive: updatedEvent.isActive,
        createdAt: updatedEvent.addedDate,
        modifiedAt: updatedEvent.modifiedDate,
      },
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete an event (set isActive to false)
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();
    const token = await getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const clientOrganizationId = token.clientOrganizationId;

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      );
    }

    // Find and soft delete the event
    const deletedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        clientOrganizationId: clientOrganizationId,
      },
      {
        isActive: false,
        modifiedDate: new Date(),
      },
      { new: true }
    );

    if (!deletedEvent) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting event:", error);
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}
