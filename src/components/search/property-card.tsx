"use client";

import { Building, MapPin, DollarSign, Square, ExternalLink } from "lucide-react";
import { Property } from "./property-search";

interface PropertyCardProps {
  property: Property;
}

const PropertyCard = ({ property }: PropertyCardProps) => {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card hover:border-primary transition-colors duration-300">
      {/* Property Image */}
      <div className="aspect-video w-full overflow-hidden bg-muted relative">
        <img 
          src={property.imageUrl} 
          alt={property.title}
          className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded uppercase font-medium">
          {property.type}
        </div>
      </div>
      
      {/* Property Details */}
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-medium text-lg line-clamp-1">{property.title}</h3>
          <div className="flex items-center text-muted-foreground text-sm mt-1">
            <MapPin size={14} className="mr-1" />
            <span className="line-clamp-1">{property.location}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center text-foreground">
            <DollarSign size={16} className="mr-1 text-primary" />
            <span className="font-medium">{property.price}</span>
          </div>
          <div className="flex items-center text-foreground">
            <Square size={16} className="mr-1 text-primary" />
            <span>{property.size}</span>
          </div>
        </div>
        
        <p className="text-muted-foreground text-sm line-clamp-2">
          {property.description}
        </p>
        
        <div className="pt-2 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Listed: {new Date(property.createdAt).toLocaleDateString()}
          </span>
          <a 
            href={property.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center text-primary hover:text-primary/80 text-sm font-medium"
          >
            View on Crexi
            <ExternalLink size={14} className="ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default PropertyCard; 