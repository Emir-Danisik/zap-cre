import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define interfaces for our schema types
interface PropertySchema {
  propertyId: { type: string };
  isGoodFit: { type: string };
  fitScore: { 
    type: string;
    description: string;
  };
}

interface BasicSchema {
  type: string;
  properties: {
    results: {
      type: string;
      items: {
        type: string;
        properties: PropertySchema;
        required: string[];
      }
    }
  };
  required: string[];
}

interface EnhancedSchema extends BasicSchema {
  properties: {
    results: {
      type: string;
      items: {
        type: string;
        properties: PropertySchema;
        required: string[];
      }
    };
    description: {
      type: string;
      description: string;
    };
  };
}

/**
 * API route that uses OpenAI to analyze if properties match a user's search criteria
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { query, apiResponse, userQuestion } = await request.json();
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }
    
    if (!apiResponse || !apiResponse.data || !Array.isArray(apiResponse.data) || apiResponse.data.length === 0) {
      return NextResponse.json({ error: 'Valid API response with properties is required' }, { status: 400 });
    }

    // Define the schema for OpenAI to follow
    let schema: BasicSchema | EnhancedSchema = {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              propertyId: { type: "string" },
              isGoodFit: { type: "boolean" },
              fitScore: { 
                type: "number", 
                description: "Score from 1-10 indicating how well the property matches the search criteria"
              }
            },
            required: ["propertyId", "isGoodFit", "fitScore"]
          }
        }
      },
      required: ["results"]
    };

    // If a specific user question is provided, modify the schema to include a description
    if (userQuestion) {
      schema = {
        type: "object",
        properties: {
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                propertyId: { type: "string" },
                isGoodFit: { type: "boolean" },
                fitScore: {
                  type: "number",
                  description: "Score from 1-10 indicating how well the property matches the criteria"
                }
              },
              required: ["propertyId", "isGoodFit", "fitScore"]
            }
          },
          description: {
            type: "string",
            description: "A detailed answer to the user's specific question about the properties"
          }
        },
        required: ["results", "description"]
      };
    }

    // Customize the system prompt based on whether a user question was asked
    let systemPrompt = `You are an expert real estate analysis AI assistant. 
Your task is to analyze if commercial properties match a user's search criteria.

The user has searched for: "${query}"

For each property in the list, determine:
1. Whether it's a good fit for the user's query (true/false)
2. A numerical score from 1-10 indicating how well it matches

Output JSON according to this schema:
${JSON.stringify(schema, null, 2)}`;

    // Add specific instructions for handling the user question
    if (userQuestion) {
      systemPrompt += `\n\nThe user has also asked a specific question: "${userQuestion}"

Please analyze the properties and provide:
1. A concise, direct answer using industry terminology a broker would understand
2. Focus on deal metrics, property specifics, and investment considerations
3. Reorder properties by relevance to this question
4. Use higher fit scores for properties that best match the criteria

Important: Do not reference properties by their IDs in your description. Instead, use their names, addresses, or distinctive features to identify them.

Be direct and concise - you're speaking to a real estate professional, not their client.`;
    }

    // Send to OpenAI with the entire API response
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(apiResponse) }
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from OpenAI' }, { status: 500 });
    }
    
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing AI JSON response:", parseError, "Content:", content);
      return NextResponse.json({ error: 'Invalid JSON response from AI' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      results: parsedResponse.results,
      description: parsedResponse.description || null
    });

  } catch (error: any) {
    console.error('Error analyzing property fit:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while analyzing properties', details: error.toString() },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    message: "Analyzes if properties are a good match for a search query or answers specific questions",
    usage: { 
      method: "POST", 
      body: { 
        query: "Search query text",
        apiResponse: "Full Crexi API response",
        userQuestion: "(Optional) Specific question about the properties"
      } 
    },
    returns: { 
      success: "boolean", 
      results: [
        { 
          propertyId: "string",
          isGoodFit: "boolean",
          fitScore: "number (1-10)"
        }
      ],
      description: "Optional detailed answer to user question if provided"
    }
  });
} 