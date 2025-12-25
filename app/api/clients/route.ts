import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Clients from "@/app/api/models/client";

export async function GET() {
  try {
    await dbConnect();

    const clients = await Clients.find({ isActive: true });

    return NextResponse.json(clients, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const data = await request.json();

    // Validate required fields
    if (!data.clientName || !data.clientLogo) {
      return NextResponse.json(
        { error: "Client name and logo are required" },
        { status: 400 }
      );
    }

    // Find the highest clientId currently in use
    const highestClient = await Clients.findOne().sort({ clientId: -1 });
    
    // Set the new clientId to be one higher than the current highest
    // If no clients exist yet, start with 1
    const nextClientId = highestClient ? highestClient.clientId + 1 : 1;

    // Create new client with the auto-incremented ID
    const newClient = await Clients.create({
      clientId: nextClientId,
      clientName: data.clientName,
      clientLogo: data.clientLogo,
      clientWebsite: data.clientWebsite || "",
      clientDescription: data.clientDescription || "",
      isActive: true,
      addedDate: new Date(),
    });

    return NextResponse.json(newClient, { status: 201 });
  } catch (error: any) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create client" },
      { status: 500 }
    );
  }
}
