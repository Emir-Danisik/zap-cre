import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

// You should store this in an environment variable
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR_ID = 'JeaJthm26KstkYpr6'; // Crexi scraper actor ID

export async function POST(request: NextRequest) {
  try {
    // Get request body which should only contain a Crexi URL
    const body = await request.json();
    const crexiUrl = body.url;
    
    // Validate URL
    if (!crexiUrl || !crexiUrl.includes('crexi.com')) {
      return NextResponse.json(
        { error: 'Invalid or missing Crexi URL' },
        { status: 400 }
      );
    }
    
    // Initialize the ApifyClient with API token
    const client = new ApifyClient({
      token: APIFY_API_TOKEN,
    });

    // Check if we have an API token
    if (!APIFY_API_TOKEN) {
      return NextResponse.json(
        { error: 'APIFY_API_TOKEN is missing in environment variables' },
        { status: 500 }
      );
    }

    // Configure input for the Crexi scraper using only the provided URL
    const input = {
      "startUrls": [crexiUrl],
      "moreResults": false,
      "includeListingDetails": true,
      "includeBrokerDetails": false,
      "maxConcurrency": 20,
      "minConcurrency": 10,
      "maxRequestRetries": 10,
      "cookies": [],
      "proxy": {
        "useApifyProxy": true,
        "apifyProxyGroups": [
          "RESIDENTIAL"
        ],
        "apifyProxyCountry": "US"
      }
    };

    // Run the Actor and wait for it to finish
    const run = await client.actor(ACTOR_ID).call(input);

    // Fetch Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    // Return the results
    return NextResponse.json({
      success: true,
      data: items,
      runInfo: {
        id: run.id,
        status: run.status,
        datasetId: run.defaultDatasetId
      }
    });
  } catch (error: any) {
    console.error('Error running Apify actor:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while scraping Crexi data',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

// Also allow GET requests for testing with a sample URL
export async function GET() {
  try {
    // Initialize the ApifyClient with API token
    const client = new ApifyClient({
      token: APIFY_API_TOKEN,
    });

    // Check if we have an API token
    if (!APIFY_API_TOKEN) {
      return NextResponse.json(
        { error: 'APIFY_API_TOKEN is missing in environment variables' },
        { status: 500 }
      );
    }

    // Sample Crexi URL for testing
    const sampleUrl = "https://www.crexi.com/properties?placeIds%5B%5D=ChIJG8CuwJzfAFQRNduKqSde27w&types%5B%5D=Land";

    // Configure input with the sample URL
    const input = {
      "startUrls": [sampleUrl],
      "moreResults": false,
      "includeListingDetails": true,
      "includeBrokerDetails": false,
      "maxConcurrency": 20,
      "minConcurrency": 10,
      "maxRequestRetries": 10,
      "cookies": [],
      "proxy": {
        "useApifyProxy": true,
        "apifyProxyGroups": [
          "RESIDENTIAL"
        ],
        "apifyProxyCountry": "US"
      }
    };

    // Run the Actor and wait for it to finish
    const run = await client.actor(ACTOR_ID).call(input);

    // Fetch Actor results from the run's dataset
    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    
    // Return the results
    return NextResponse.json({
      success: true,
      data: items,
      runInfo: {
        id: run.id,
        status: run.status,
        datasetId: run.defaultDatasetId
      }
    });
  } catch (error: any) {
    console.error('Error running Apify actor:', error);
    return NextResponse.json(
      { 
        error: error.message || 'An error occurred while scraping Crexi data',
        details: error.toString()
      },
      { status: 500 }
    );
  }
} 