"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PropertySearchForm from "./property-search-form";
import PropertyResults from "./property-results";
import { SearchLoading } from "./search-loading";
import { generateUrl, fetchCrexiResults, isCrexiUrl, transformCrexiResults, rankPropertiesByFit } from "@/lib/search-service";
import { recordSearch } from "@/lib/search-db";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, Search, Send } from "lucide-react";
import { toast } from "sonner";

// Define the property type that will be used throughout the search components
export interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
  size: string;
  type: string;
  imageUrl: string;
  description: string;
  createdAt: string;
  url: string;
  // Add optional ranking fields
  isGoodFit?: boolean;
  fitScore?: number;
}

const PropertySearch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<Property[]>([]);
  const [displayedResults, setDisplayedResults] = useState<Property[]>([]);
  const [totalApiCount, setTotalApiCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth();
  
  // Chat state
  const [chatInput, setChatInput] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  
  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setSearchQuery(query);
    setError(null);
    setResults([]);
    setDisplayedResults([]);
    setTotalApiCount(0);
    setChatResponse(null);
    
    const toastId = toast.loading(
      'Searching for properties...',
      {
        position: 'top-right',
        duration: 6000,
        icon: '🔍',
        style: {
          backgroundColor: '#10b981', // Green background
          color: 'white',
          fontWeight: '500',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        },
        description: 'This search may take 2-3 minutes to complete'
      }
    );
    
    try {
      // Check if the query is already a Crexi URL
      let crexiUrl: string;
      
      if (isCrexiUrl(query)) {
        crexiUrl = query;
        toast.loading('Processing Crexi URL...', { id: toastId });
      } else {
        toast.loading('Generating search URL...', { id: toastId });
        crexiUrl = await generateUrl(query);
        toast.success('URL generated successfully!', { id: toastId });
      }
      
      // Fetch the results from the Crexi API using the URL
      toast.loading('Fetching property listings...', { id: toastId });
      const crexiData = await fetchCrexiResults(crexiUrl);
      
      if (!crexiData.success) {
        throw new Error(crexiData.error || 'Failed to fetch Crexi data');
      }
      
      toast.success(`Found ${crexiData.data.length} properties!`, { id: toastId });
      
      // Transform the results
      toast.loading('Processing property data...', { id: toastId });
      const transformedResults = transformCrexiResults(crexiData.data);
      
      // Get total count
      const totalCount = crexiData.totalCount || (crexiData.data ? crexiData.data.length : 0);
      setTotalApiCount(totalCount);

      // Rank the properties
      toast.loading('Ranking properties by relevance...', { id: toastId });
      const rankedResults = await rankPropertiesByFit(query, crexiData, transformedResults);
      toast.success('Properties ranked successfully!', { id: toastId });

      // Record search
      toast.loading('Saving your search...', { id: toastId });
      await recordSearch({
        user_id: userId || undefined,
        query,
        api_response: crexiData
      }).catch(err => {
        console.error("Failed to record search:", err);
        // Don't fail the whole process if this fails
      });
      
      // Update state
      setResults(rankedResults);
      setDisplayedResults(rankedResults);
      
      toast.success('Search completed successfully!', { id: toastId });
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || "An error occurred while searching. Please try again.");
      toast.error(`Search failed: ${err.message || "Unknown error"}`, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle chat input
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatInput.trim() || results.length === 0) return;
    
    try {
      setChatResponse("Analyzing properties...");
      
      // Call the enhanced property-fit API with the user's question
      const response = await fetch('/api/property-fit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          apiResponse: { data: results }, // Pass the current results as the API response
          userQuestion: chatInput // Pass the user's question
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze properties for this question.');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to process question.');
      }
      
      // Set the descriptive response from the API
      setChatResponse(data.description);
      
      // Reorder the properties based on the API results
      if (data.results && Array.isArray(data.results)) {
        // Create a map of property IDs to their new fit scores
        const fitScoreMap = new Map();
        data.results.forEach((result: {propertyId: string, isGoodFit: boolean, fitScore: number}) => {
          fitScoreMap.set(result.propertyId.toString(), {
            isGoodFit: result.isGoodFit,
            fitScore: result.fitScore
          });
        });
        
        // Update the properties with the new fit scores and sort them
        const rerankedProperties = results.map(property => {
          const propertyIdString = property.id.toString();
          const fitInfo = fitScoreMap.get(propertyIdString) || { isGoodFit: false, fitScore: 0 };
          return {
            ...property,
            isGoodFit: fitInfo.isGoodFit,
            fitScore: fitInfo.fitScore
          };
        });
        
        // Sort by fit score (highest first)
        rerankedProperties.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
        setDisplayedResults(rerankedProperties);
      }
    } catch (error) {
      console.error('Error analyzing properties for question:', error);
      setChatResponse("I'm sorry, I couldn't analyze these properties for your question at the moment. Please try again later.");
    }
    
    // Clear input
    setChatInput("");
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Search Form - Always visible */}
      <PropertySearchForm onSearch={handleSearch} />
      
      {/* Loading State */}
      {isLoading && (
        <SearchLoading query={searchQuery} />
      )}
      
      {/* Error State */}
      {!isLoading && error && (
        <div className="text-center p-8">
          <p className="text-destructive">{error}</p>
          <button 
            onClick={() => handleSearch(searchQuery)}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Results with Chat at the top */}
      {!isLoading && !error && displayedResults.length > 0 && (
        <>
          {/* Chat interface - Moved to top of results */}
          <div className="w-full border border-border rounded-lg overflow-hidden mb-6 shadow-sm">
            <div className="bg-primary/5 border-b border-border px-4 py-3 flex items-center">
              <div className="bg-primary/10 p-1.5 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-primary">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="font-medium text-sm">Ask about these properties</h3>
            </div>
            
            {chatResponse && (
              <div className="bg-secondary/20 p-4 border-b border-border">
                <div className="flex items-start">
                  <div className="bg-primary rounded-full p-1.5 mr-3 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4 text-primary-foreground">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-sm leading-relaxed">{chatResponse}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleChatSubmit} className="flex items-center p-3 bg-background">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about these listings (e.g., 'Which properties have 7%+ cap rates with NNN leases?')"
                className="flex-grow px-4 py-2.5 text-sm rounded-md border border-input focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 bg-background"
              />
              <button 
                type="submit"
                className="ml-2 p-2.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                disabled={!chatInput.trim()}
              >
                <Send size={16} />
              </button>
            </form>
          </div>
          
          {/* Property listings */}
          <PropertyResults properties={displayedResults} totalApiCount={totalApiCount} />
        </>
      )}
    </div>
  );
};

export default PropertySearch; 