"use client";

import { isCrexiUrl } from "@/lib/search-service";
import { Loader2 } from "lucide-react";

interface SearchLoadingProps {
  query: string;
}

export const SearchLoading = ({ query }: SearchLoadingProps) => {
  // Format URL for display
  const getDisplayQuery = (query: string) => {
    if (isCrexiUrl(query)) {
      return "Crexi URL";
    }
    return query;
  };

  // Whether to show a specific message for URL mode
  const isSearchingWithUrl = isCrexiUrl(query);
  
  return (
    <div className="w-full flex flex-col items-center justify-center py-16 space-y-6">
      {/* Animated Loading Spinner */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
        <Loader2 size={24} className="text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      </div>
      
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium text-foreground">Finding Client Properties</h3>
        <p className="text-muted-foreground max-w-md">
          {query ? (
            isSearchingWithUrl ? 
              "Searching with Crexi URL" :
              <>Searching for <span className="font-medium text-foreground">"{getDisplayQuery(query)}"</span></>
          ) : (
            "Processing your client's requirements"
          )}
        </p>
      </div>
      
      {/* Progress Steps */}
      <div className="max-w-md w-full space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-primary">Querying Crexi</span>
            <span className="text-muted-foreground">Complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full w-full"></div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-primary">Matching client requirements</span>
            <span className="text-muted-foreground">In progress</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full w-3/4 animate-pulse"></div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Ranking best matches</span>
            <span className="text-muted-foreground">Pending</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full w-0"></div>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4">
        Analyzing {isSearchingWithUrl ? "properties from Crexi" : "100+ listings"} to find perfect matches for your client
      </p>
    </div>
  );
}; 