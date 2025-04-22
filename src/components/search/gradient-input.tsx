"use client";

import React, { useState } from "react";
import { Link2, Sparkles, X } from "lucide-react";
import { isCrexiUrl } from "@/lib/search-service";

interface SearchInputProps {
  placeholder?: string;
  suggestions?: string[];
  onSubmit?: (value: string) => void;
}

export function SearchInput({
  placeholder = "e.g. Retail in Miami, >5000 sq ft, under $2M, w/ parking",
  suggestions,
  onSubmit,
}: SearchInputProps) {
  const [value, setValue] = useState("");
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [truncatedUrl, setTruncatedUrl] = useState("");
  
  const urlPlaceholder = "Paste a Crexi search URL (e.g. https://www.crexi.com/properties?...)";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // Could implement autocomplete behavior here
    }
  };

  const handleSubmit = () => {
    if (!value.trim()) return;
    
    // Validate URL if in URL mode
    if (isUrlMode) {
      if (!isCrexiUrl(value)) {
        alert('Please enter a valid Crexi URL');
        return;
      }
    }
    
    if (onSubmit) {
      onSubmit(value);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue(suggestion);
    if (onSubmit) {
      onSubmit(suggestion);
    }
  };
  
  const toggleMode = () => {
    setValue(""); // Clear input when switching modes
    setIsUrlMode(!isUrlMode);
    setTruncatedUrl("");
  };

  // Format and truncate URLs for better display
  const formatUrl = (url: string) => {
    if (!url || !isCrexiUrl(url)) return url;
    
    try {
      // Extract base URL 
      const urlObj = new URL(url);
      const baseUrl = `${urlObj.origin}/properties`;
      
      // Get key parameters for display
      const params = new URLSearchParams(urlObj.search);
      
      // Show more of the query parameters (up to 70 characters)
      const searchPart = urlObj.search;
      const truncatedSearch = searchPart.length > 70 
        ? searchPart.substring(0, 70) + '...' 
        : searchPart;
      
      return `${baseUrl}${truncatedSearch}`;
    } catch (e) {
      // Fallback to simple truncation with more characters
      return url.length > 100 ? url.substring(0, 100) + '...' : url;
    }
  };

  // Auto-detect if a pasted URL is a Crexi URL
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    
    // If it looks like a Crexi URL
    if (isCrexiUrl(newValue)) {
      // Switch to URL mode if needed
      if (!isUrlMode) {
        setIsUrlMode(true);
      }
      // Set truncated URL for display
      setTruncatedUrl(formatUrl(newValue));
    } else {
      setTruncatedUrl("");
    }
  };

  return (
    <div className="w-full max-w-3xl">
      {/* Input container with faint navy blue gradient border */}
      <div className="relative">
        {/* Pseudo-gradient border using only --primary from globals.css */}
        <div className="absolute inset-0 rounded-lg pointer-events-none z-0" style={{
          background: "linear-gradient(90deg, hsl(var(--primary)/0.15), hsl(var(--primary)/0.25), hsl(var(--primary)/0.15))",
          padding: 2,
        }} />
        <div className="relative z-10 bg-background rounded-lg border border-transparent p-1">
          {/* Show this for URL mode with long URLs */}
          {isUrlMode && truncatedUrl && (
            <div 
              className="w-full p-4 min-h-[60px] bg-transparent text-foreground outline-none rounded-md text-base pt-10 cursor-text flex items-center"
              onClick={() => document.getElementById('search-textarea')?.focus()}
              title={value} // Show full URL on hover
            >
              <span className="font-mono text-sm overflow-hidden text-ellipsis whitespace-nowrap">
                {truncatedUrl}
              </span>
            </div>
          )}
          
          {/* Regular textarea - hidden for long URLs */}
          <textarea
            id="search-textarea"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={isUrlMode ? urlPlaceholder : placeholder}
            className={`w-full p-4 min-h-[60px] bg-transparent text-foreground placeholder-muted-foreground outline-none rounded-md resize-none text-base pt-10 ${
              isUrlMode && truncatedUrl ? 'absolute opacity-0 h-0' : ''
            }`}
            rows={2}
          />
          
          {/* Mode indicators */}
          <div className="absolute top-3 left-4 flex items-center">
            <div className={`px-2 py-1 rounded-md text-xs flex items-center ${isUrlMode ? 'text-muted-foreground' : 'bg-primary/10 text-primary font-medium'}`}>
              <Sparkles size={14} className="mr-1" />
              AI Search
            </div>
            <div className={`ml-2 px-2 py-1 rounded-md text-xs flex items-center ${isUrlMode ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground'}`}>
              <Link2 size={14} className="mr-1" />
              Crexi URL
            </div>
          </div>
          
          {/* Mode toggle button */}
          <button
            onClick={toggleMode}
            className="absolute top-3 right-3 p-1.5 rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
            title={isUrlMode ? "Switch to AI Search" : "Switch to Crexi URL"}
          >
            {isUrlMode ? (
              <Sparkles size={16} className="text-primary" />
            ) : (
              <Link2 size={16} className="text-primary" />
            )}
          </button>
          
          {/* Clear button - only show when there is text */}
          {value && (
            <button
              onClick={() => {
                setValue("");
                setTruncatedUrl("");
              }}
              className="absolute bottom-3 right-3 p-1 rounded-full hover:bg-muted transition-colors"
              title="Clear input"
            >
              <X size={16} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>
      
      {/* Search button */}
      <button
        onClick={handleSubmit}
        className="w-full mt-4 py-2.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        {isUrlMode ? "Search with Crexi URL" : "Search Properties"}
      </button>
      
      {/* Suggestion pills - only render if not in URL mode and suggestions exist */}
      {!isUrlMode && suggestions && suggestions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full border border-border hover:bg-muted transition-all text-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 