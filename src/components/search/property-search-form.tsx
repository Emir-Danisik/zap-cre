"use client";

import { useState } from "react";
import { SearchInput } from "./gradient-input";

interface PropertySearchFormProps {
  onSearch: (query: string) => void;
}

const PropertySearchForm = ({ onSearch }: PropertySearchFormProps) => {
  // Detailed broker-client specific commercial real estate search suggestions
  const suggestions = [
    "My client wants a Burger King style retail establishment, budget $2-4M, minimum cap rate of 5% in Phoenix suburbs",
    "Looking for medical office building near Northwestern Hospital in Chicago, 10-15k sqft, $5-7M price range, long-term tenant preferred",
    "Tech client needs Class A office space in Austin with open floor plan, 25k+ sqft, $30-35/sqft, LEED certified only",
    "Investor seeking multi-tenant industrial property in Dallas-Fort Worth, 50k+ sqft, $8-12M range, current NOI at least $750k",
    "Restaurant space with rooftop patio in Miami Beach, 3k-5k sqft, $1.5-2.5M budget, must have liquor license in place",
    "E-commerce client needs distribution center near Port of Los Angeles, 100k+ sqft, $15-20M budget, 24+ foot clear height"
  ];

  return (
    <div className="w-full max-w-3xl mx-auto">
      <SearchInput 
        placeholder="e.g. Tech client needs Class A office space in Austin with open floor plan, 25k+ sqft, $30-35/sqft, LEED certified only"
        // suggestions={suggestions}
        onSubmit={onSearch}
      />
    </div>
  );
};

export default PropertySearchForm; 