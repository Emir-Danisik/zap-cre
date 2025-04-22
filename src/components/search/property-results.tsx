"use client";

import { useState, useEffect } from "react";
import PropertyCard from "./property-card";
import { Property } from "./property-search";
import { Grid, List } from "lucide-react"; 

interface PropertyResultsProps {
  properties: Property[];
  totalApiCount: number;
}

const PropertyResults = ({ properties, totalApiCount }: PropertyResultsProps) => {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Slice properties to maximum of 10 for display
  const displayedProperties = properties.slice(0, 10);
  
  // Use the actual count of properties
  const actualCount = displayedProperties.length;

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            AI shortlisted {totalApiCount} Crexi results to {actualCount} {actualCount === 1 ? 'property' : 'properties'}
          </h2>
          <p className="text-sm text-muted-foreground">Results ranked by relevance to client requirements</p>
        </div>
        
        {/* View Toggle Buttons */}
        <div className="flex items-center space-x-2">
          <div className="border border-border rounded-md overflow-hidden flex">
            <button
              className={`p-2 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Grid size={18} />
            </button>
            <button
              className={`p-2 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Property Cards */}
        <div className="flex-grow">
          {displayedProperties.length === 0 ? (
            <div className="text-center p-8 bg-card border border-border rounded-lg">
              <p className="text-muted-foreground">No properties match your client's criteria.</p>
            </div>
          ) : (
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
            }`}>
              {/* Use the sliced properties array */}
              {displayedProperties.map(property => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PropertyResults; 