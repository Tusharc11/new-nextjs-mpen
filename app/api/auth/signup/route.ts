import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/app/api/models/user";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const body = await request.json();

    // Check if email already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists. Please use a different email address." },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Create new user with hashed password
    const userData = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      password: hashedPassword,
      address: body.address || "",
      role: body.role,
      dateJoined: body.dateJoined || new Date(),
      clientOrganizationId: body.clientOrganizationId || null,
      isActive: true,
    };

    const user = await User.create(userData);
    const userResponse = user.toObject();
    // important to remove password from response
    delete userResponse.password;

    return NextResponse.json(userResponse, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create user", details: error },
      { status: 500 }
    );
  }
}

// Add PUT method to handle admin updates
export async function PUT(request: Request) {
  try {
    await dbConnect();

    // Extract ID from query params
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    const body = await request.json();

    // Check if email is being changed and if it already exists
    if (body.email) {
      const existingUser = await User.findOne({ 
        email: body.email,
        _id: { $ne: id } // Exclude the current user from the check
      });
      
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists. Please use a different email address." },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    
    const updateData = {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      address: body.address || "",
      dateJoined: body.dateJoined || new Date(),
      clientOrganizationId: body.clientOrganizationId || null,
    };

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true } // Return the updated document
    ).select("-password"); // Exclude password from the response

    if (!updatedUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update user", details: error },
      { status: 500 }
    );
  }
}
