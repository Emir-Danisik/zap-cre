import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define type for AI output based on schema
type AiParams = {
  locationName: string;
  types?: string[];
  subtypes?: string[];
  askingPriceMin?: number;
  askingPriceMax?: number;
  capRateMin?: number;
  capRateMax?: number;
};

// Updated Schema: AI extracts locationName instead of placeIds
const schema = {
  type: "object",
  properties: {
    locationName: { type: "string" }, // e.g., "Austin, TX"
    types: { type: "array", items: { type: "string", enum: [
      "All","Retail","Multifamily","Office","Industrial","Hospitality",
      "Mixed Use","Land","Self Storage","Mobile Home Park","Senior Living",
      "Special Purpose","Note/Loan","Business for Sale"
    ] } },
    subtypes: { type: "array", items: { type: "string", enum: [
      "Bank","Convenience Store","Day Care/Nursery","QSR/Fast Food","Gas Station",
      "Grocery Store","Pharmacy/Drug","Restaurant","Bar","Storefront","Shopping Center",
      "Auto Shop","Student Housing","Single Family Rental Portfolio","RV Park","Apartment Building",
      "Traditional Office","Executive Office","Medical Office","Creative Office","Distribution",
      "Flex","Warehouse","R&D","Manufacturing","Refrigerated/Cold Storage","Hotel",
      "Motel","Casino","Agricultural","Residential","Commercial","Industrial","Islands",
      "Farm","Ranch","Timber","Hunting/Recreational","Telecom/Data Center","Sports/Entertainment",
      "Marina","Golf Course","School","Religious/Church","Garage/Parking","Car Wash",
      "Airport","Business Only","Business and Building"
    ] } },
    askingPriceMin: { type: "number" },
    askingPriceMax: { type: "number" },
    capRateMin: { type: "number" },
    capRateMax: { type: "number" }
  },
  required: ["locationName"], // Location name is now required
  additionalProperties: false
};

/**
 * Builds a Crexi URL from structured parameters.
 */
function buildCrexiUrl(params: Record<string, any>): string {
  const baseUrl = 'https://www.crexi.com/properties?';
  const queryParams = new URLSearchParams();

  // Handle arrays: placeIds, types, subtypes
  ['placeIds', 'types', 'subtypes'].forEach(key => {
    if (params[key] && Array.isArray(params[key])) {
      params[key].forEach((value: string) => {
        if (value) { // Avoid adding empty/null values
           queryParams.append(`${key}[]`, value);
        }
      });
    }
  });

  // Handle numeric parameters
  ['askingPriceMin', 'askingPriceMax', 'capRateMin', 'capRateMax'].forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      queryParams.set(key, params[key].toString());
    }
  });

  // Construct final URL
  const queryString = queryParams.toString().replace(/%5B%5D/g, '[]'); // Use [] if preferred
  return baseUrl + queryString;
}

/**
 * Generates a formatted Crexi search URL based on user parameters
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { query } = await request.json();
    const baseUrl = request.nextUrl.origin; // Get base URL for internal API calls

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    // Updated prompt: Emphasize extracting specific city names.
    const systemPrompt = `You are an expert real estate search parameter extractor.
Use this JSON schema to parse the user query into parameters:
${JSON.stringify(schema, null, 2)}

Extract the parameters (locationName, types[], subtypes[], askingPriceMin, askingPriceMax, capRateMin, capRateMax) from the user query.
**Crucially, for the 'locationName' field, identify and extract the specific city and state (e.g., "Chicago, IL", "Sacramento, CA", "Miami, FL"). Avoid using broad regional terms like "metro area" or "Southern California". If multiple cities are mentioned, use the most prominent one.**
Output *only* the valid JSON object matching the schema. Do NOT include pageSize, mapZoom, or mapCenter. Ensure locationName is always included.`;
    const userPrompt = `User query: ${query}`;

    // 1. Get parameters from AI
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }
    
    let parsedParams: AiParams; // Use the defined type
    try {
      parsedParams = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing AI JSON response:", parseError, "Content:", content);
      return NextResponse.json({ error: 'Invalid JSON response from AI' }, { status: 500 });
    }

    // 2. Get Place ID using the extracted locationName
    const locationName = parsedParams.locationName; // Now type-safe
    if (!locationName) {
       console.error("AI did not return locationName. Params:", parsedParams);
       return NextResponse.json({ error: 'Could not determine location from query.' }, { status: 400 });
    }

    const placeIdResponse = await fetch(`${baseUrl}/api/crexi/get-place-id?placeName=${encodeURIComponent(locationName)}`);
    
    if (!placeIdResponse.ok) {
       const errorData = await placeIdResponse.json();
       console.error(`Error fetching Place ID for "${locationName}":`, placeIdResponse.status, errorData);
       return NextResponse.json({ error: `Failed to find Place ID for location: ${locationName}`, details: errorData.error }, { status: placeIdResponse.status });
    }

    const placeIdData = await placeIdResponse.json();
    const placeId = placeIdData.placeId;

    if (!placeId) {
        console.error(`Place ID not found in response for "${locationName}"`);
        return NextResponse.json({ error: `Place ID lookup failed for location: ${locationName}` }, { status: 404 });
    }

    // 3. Construct the final URL
    const finalParams: Record<string, any> = {
       ...parsedParams,
       placeIds: [placeId] // Add the fetched placeId
    };
    delete finalParams.locationName; // Remove locationName as it's not a Crexi URL param

    const url = buildCrexiUrl(finalParams);

    console.log("Search URL:", url);

    return NextResponse.json({ success: true, url });

  } catch (error: any) {
    console.error('Error generating URL:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating the URL', details: error.toString() },
      { status: 500 }
    );
  }
}

// GET endpoint instructions should be updated to reflect the new process
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "Generates Crexi URL. Extracts location from query, gets Place ID via /api/crexi/get-place-id, constructs URL.",
    usage: { method: "POST", body: { query: "..." } },
    returns: { success: "boolean", url: "Constructed Crexi URL" }
  });
} 