import dbConnect from "@/lib/mongodb";
import Role from "@/app/api/models/role";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await dbConnect();

    const roles = await Role.find().sort({ role_name: 1 });
    return NextResponse.json(roles);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}


