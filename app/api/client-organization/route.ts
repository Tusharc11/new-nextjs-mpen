import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import ClientOrganization from "@/app/api/models/clientOrganization";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { clientId, organizationId } = await request.json();

    // Validate required fields
    if (!clientId || !organizationId) {
      return NextResponse.json(
        { error: "Client ID and Organization ID are required" },
        { status: 400 }
      );
    }

    // Check if the relationship already exists
    let clientOrg = await ClientOrganization.findOne({
      clientId,
      organizationId,
      isActive: true,
    });

    // If it doesn't exist, create it
    if (!clientOrg) {
      clientOrg = await ClientOrganization.create({
        clientId,
        organizationId,
        isActive: true,
        addedDate: new Date(),
      });
    }

    return NextResponse.json(clientOrg, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Get the URL object
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const clientOrgId = searchParams.get("clientOrgId");

    // Fetch based on clientOrgId for unique result
    if (clientOrgId) {
      const clientOrg = await ClientOrganization.findOne({
        _id: clientOrgId,
        isActive: true,
      })
        .populate("organizationId")
        .populate("clientId");

      if (!clientOrg) {
        return NextResponse.json(
          { error: "Client organization relationship not found" },
          { status: 404 }
        );
      }

      // Append organization name to the response
      const response = {
        ...clientOrg.toObject(),
        organizationName: clientOrg.organizationId?.organizationName || null,
      };

      return NextResponse.json(response, { status: 200 });
    } 
    // Fetch all relationships for a client
    else if (clientId) {
      const clientOrgs = await ClientOrganization.find({
        clientId,
        isActive: true,
      }).populate("organizationId");
      
      return NextResponse.json(clientOrgs, { status: 200 });
    }
    // Return error if neither parameter is provided
    else {
      return NextResponse.json(
        { error: "Either Client ID or Client Organization ID is required" },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error("Error fetching client-organization relationships:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch relationships" },
      { status: 500 }
    );
  }
}
