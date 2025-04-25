import { NextRequest, NextResponse } from 'next/server';
// Removed unused Client import
// import { Client } from '@googlemaps/google-maps-services-js';

// Removed unused client instance
// const client = new Client({});

const PLACES_API_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/**
 * GET endpoint to find Google Place ID using Text Search (New) API.
 * Example: /api/crexi/get-place-id?placeName=Austin%2C%20TX
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const placeName = searchParams.get('placeName');
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'Google Maps API key is not configured.' }, { status: 500 });
  }

  if (!placeName) {
    return NextResponse.json({ error: 'Missing placeName query parameter.' }, { status: 400 });
  }

  try {
    const response = await fetch(PLACES_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        // IMPORTANT: Specify required fields via FieldMask - ONLY placeId
        'X-Goog-FieldMask': 'places.id' 
      },
      body: JSON.stringify({
        textQuery: placeName
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`Google Places API Error (${response.status}):`, data);
      const errorMessage = data?.error?.message || 'Failed to fetch place ID from Google.';
      return NextResponse.json({ error: errorMessage, details: data }, { status: response.status });
    }

    if (data.places && data.places.length > 0) {
      const place = data.places[0]; // Get the first result
      // Return ONLY the placeId
      return NextResponse.json({ placeId: place.id });
    } else {
      console.warn(`Place ID not found for "${placeName}". Response:`, data);
      return NextResponse.json(
        { error: 'Place not found.', details: 'No matching places found for the query.' }, 
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('Error calling Google Places API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message },
      { status: 500 }
    );
  }
}

// Optional: Add POST support if needed
// export async function POST(request: NextRequest): Promise<NextResponse> { ... } 