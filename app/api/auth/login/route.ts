'use server'

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import dbConnect from "../../../../lib/mongodb"; // Adjust the import path as needed
import User from "../../models/user";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { createToken, verifyToken } from '@/lib/auth';
import { UserRole } from '@/lib/role';

export async function POST(request: Request) {
  try {
    await dbConnect(); // Connect to the database

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Create the token
    const token = await createToken({
      id: existingUser._id.toString(),
      email: existingUser.email,
      role: existingUser.role as UserRole,
      name: existingUser.firstName + " " + existingUser.lastName,
      clientOrganizationId: existingUser.clientOrganizationId
    });

    // Convert Mongoose document to a plain object
    const userObject = existingUser.toObject ? 
      existingUser.toObject() : 
      JSON.parse(JSON.stringify(existingUser));
    
    // Remove password from the user object
    const { password: _, ...userWithoutPassword } = userObject;

    // Return token in the response body instead of setting a cookie
    return NextResponse.json({
      user: userWithoutPassword,
      token: token,
      message: "Login successful",
    });

  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred while authenticating the user" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userData = await verifyToken(token);
    
    if (!userData) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json({ user: userData });
  } catch (error) {
    return NextResponse.json(
      { error: "An error occurred while fetching user data" },
      { status: 500 }
    );
  }
}
