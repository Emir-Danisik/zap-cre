/**
 * Search service for property search functionality
 * Handles API calls to generate URL and fetch data from Crexi
 */

import { mockCrexiResponse } from './mock-data';

// Set to true to use mock data instead of making API calls
const USE_MOCK_DATA = false;

/**
 * Generate a Crexi URL from a search query
 * @param query The search query
 * @returns Promise with the generated URL
 */
export async function generateUrl(query: string): Promise<string> {
  if (USE_MOCK_DATA) {
    console.log('Using mock data for generateUrl');
    // Return a fake URL for development
    return `https://www.crexi.com/properties?mockQuery=${encodeURIComponent(query)}`;
  }

  const response = await fetch('/api/crexi/generate-url', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate URL');
  }

  const data = await response.json();
  return data.url;
}

/**
 * Check if a string is a valid Crexi URL
 * @param url String to check
 * @returns Boolean indicating if the string is a valid Crexi URL
 */
export function isCrexiUrl(url: string): boolean {
  return url.includes('crexi.com') && url.includes('properties');
}

/**
 * Fetch search results from Crexi using a URL
 * @param url Crexi URL to fetch results from
 * @returns Promise with the search results
 */
export async function fetchCrexiResults(url: string): Promise<any> {
  if (USE_MOCK_DATA) {
    console.log('Using mock data for fetchCrexiResults');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return the mock data with the expected structure
    return {
      success: true,
      data: mockCrexiResponse,
      runInfo: {
        id: "mock-run-id",
        status: "SUCCEEDED",
        datasetId: "mock-dataset-id"
      }
    };
  }

  const response = await fetch('/api/crexi', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch Crexi results');
  }

  return response.json();
}

/**
 * Transform the raw Crexi API response into the Property interface format
 * @param items Array of items from the Crexi API response
 * @returns Array of Property objects
 */
export function transformCrexiResults(items: any[]): any[] {
  return items.map(item => ({
    id: item.id || `property-${Math.random().toString(36).substr(2, 9)}`,
    title: item.propertyName || item.name || item.title || 'Unnamed Property',
    location: item.displayLocation || item.fullAddress || getFullAddress(item) || 'Location not available',
    price: formatPrice(item),
    size: formatSize(item),
    type: item.type || (item.types && item.types.length > 0 ? item.types[0] : 'Commercial'),
    imageUrl: getImageUrl(item),
    description: item.description || 'No description available',
    createdAt: item.publishDate || item.activatedOn || new Date().toISOString(),
    url: item.url || item.url1 || '',
  }));
}

/**
 * Extract full address from the location object
 */
function getFullAddress(item: any): string {
  if (item.locations && item.locations.length > 0) {
    const location = item.locations[0];
    if (location.fullAddress) {
      return location.fullAddress;
    }
    if (location.address && location.city && location.state) {
      return `${location.address}, ${location.city}, ${location.state.code}`;
    }
  }
  return '';
}

/**
 * Format the price from a Crexi property item
 */
function formatPrice(item: any): string {
  if (item.askingPrice) {
    return `$${numberWithCommas(item.askingPrice)}`;
  }
  if (item.details && item.details.details && item.details.details["Asking Price"]) {
    return item.details.details["Asking Price"];
  }
  return item.price || 'N/A';
}

/**
 * Format the size from a Crexi property item
 */
function formatSize(item: any): string {
  if (item.buildingSize) {
    return `${numberWithCommas(item.buildingSize)} sqft`;
  }
  if (item.lotSize) {
    return `${numberWithCommas(item.lotSize)} ${item.lotSizeUnit || 'sqft'}`;
  }
  if (item.details && item.details.details && item.details.details["Square Footage"]) {
    return `${item.details.details["Square Footage"]} sqft`;
  }
  return item.size || 'N/A sqft';
}

/**
 * Get the image URL from a Crexi property item
 */
function getImageUrl(item: any): string {
  if (item.photos && item.photos.length > 0) {
    return item.photos[0].url || item.photos[0];
  }
  if (item.thumbnailUrl) {
    return item.thumbnailUrl;
  }
  if (item.mainPhoto) {
    return item.mainPhoto;
  }
  if (item.imageUrl) {
    return item.imageUrl;
  }
  // Default image if none is available
  return 'https://via.placeholder.com/300x200?text=No+Image+Available';
}

/**
 * Format a number with commas for thousands
 */
function numberWithCommas(x: number): string {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Rank properties based on how well they match the search query
 * @param query The search query
 * @param apiResponse The raw Crexi API response
 * @param properties The transformed properties
 * @returns Ranked properties with fit scores
 */
export async function rankPropertiesByFit(query: string, apiResponse: any, properties: any[]): Promise<any[]> {
  try {
    // Call the property-fit API to get rankings
    const response = await fetch('/api/crexi/property-fit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        apiResponse
      }),
    });

    if (!response.ok) {
      console.error('Failed to get property fit rankings:', response.statusText);
      return properties; // Return original properties if ranking fails
    }

    const data = await response.json();
    
    if (!data.success || !data.results || !Array.isArray(data.results)) {
      console.error('Invalid response from property-fit API');
      return properties;
    }

    // Create a map of property IDs to their fit scores
    const fitScoreMap = new Map();
    data.results.forEach((result: any) => {
      fitScoreMap.set(result.propertyId, {
        isGoodFit: result.isGoodFit,
        fitScore: result.fitScore
      });
    });

    // Add fit scores to properties and sort by score (highest first)
    const rankedProperties = properties.map(property => {
      const propertyIdString = property.id.toString(); // Convert ID to string for lookup
      const fitInfo = fitScoreMap.get(propertyIdString) || { isGoodFit: false, fitScore: 0 };
      return {
        ...property,
        isGoodFit: fitInfo.isGoodFit,
        fitScore: fitInfo.fitScore
      };
    });

    // Sort by fit score (highest first)
    rankedProperties.sort((a, b) => b.fitScore - a.fitScore);

    return rankedProperties;
  } catch (error) {
    console.error('Error ranking properties:', error);
    return properties; // Return original properties if ranking fails
  }
} 