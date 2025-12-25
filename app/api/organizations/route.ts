import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Organizations from "@/app/api/models/organization";
import ClientOrganization from "@/app/api/models/clientOrganization";

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Get the URL object
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const includeDefault = searchParams.get('includeDefault') === 'true';
    
    let organizations = [];
    
    if (clientId) {
      // If clientId is provided, fetch organizations linked to this client
      const clientOrgs = await ClientOrganization.find({ 
        clientId, 
        isActive: true 
      }).select('organizationId');
      
      if (clientOrgs.length > 0) {
        // If there are mapped organizations, fetch and return only those
        const orgIds = clientOrgs.map(co => co.organizationId);
        
        organizations = await Organizations.find({
          _id: { $in: orgIds },
          isActive: true
        });
      } else if (includeDefault) {
        // Only if no organizations are mapped AND includeDefault is true,
        // fetch the default organization
        const defaultOrg = await Organizations.findOne({ organizationId: -1 });
        if (defaultOrg) {
          organizations = [defaultOrg];
        }
      }
      // If there are no mapped orgs and includeDefault is false, return empty array
    } else {
      // Otherwise, fetch all active organizations except the default one
      organizations = await Organizations.find({ 
        isActive: true,
        organizationId: { $ne: -1 } // Exclude the default organization
      });
    }

    return NextResponse.json(organizations, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const data = await request.json();

    // Validate required fields - only name is required now
    if (!data.organizationName) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      );
    }

    // Find the highest organizationId currently in use (excluding negative values)
    const highestOrg = await Organizations.findOne({
      organizationId: { $gt: 0 } // Only consider positive IDs
    }).sort({
      organizationId: -1,
    });

    // Set the new organizationId to be one higher than the current highest
    // If no organizations exist yet, start with 1
    const nextOrgId = highestOrg ? highestOrg.organizationId + 1 : 1;
    
    // Create organization data with all required fields explicitly set
    const orgData = {
      organizationId: nextOrgId,
      organizationName: data.organizationName,
      organizationLogo: data.organizationLogo || "",
      organizationWebsite: data.organizationWebsite || "",
      organizationDescription: data.organizationDescription || "",
      isActive: true,
      addedDate: new Date(),
    };

    // Create new organization with explicit fields
    const newOrg = await Organizations.create(orgData);

    return NextResponse.json(newOrg, { status: 201 });
  } catch (error: any) {
    // Provide more specific error message for duplicate key errors
    if (error.code === 11000) {
      // Log the detailed error information to help diagnose the issue

      return NextResponse.json(
        { error: "An organization with this ID already exists. Please try again." },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to create organization" },
      { status: 500 }
    );
  }
}
