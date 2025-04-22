"use client";

import React from "react";
import Link from "next/link";
import { Suspense } from "react";
import PropertySearch from "@/components/search/property-search";

export default function Home() {

  return (
    // Outermost container: Full screen height, flex column
    <main className="flex min-h-[calc(80vh-4rem)] flex-col items-center">
      {/* Content container: Takes up most space (80vh), centers content vertically */}
      <div className="container max-w-5xl mx-auto space-y-8 flex flex-col items-center justify-center flex-grow min-h-[calc(80vh-4rem)]">
        <header className="text-center space-y-2">
          <h1 className="text-5xl font-bold text-primary">
            AI Property Search
          </h1>
          <p className="text-xl text-muted-foreground">
            Type in natural language to find properties 10X faster
          </p>
        </header>
        
        <Suspense fallback={<div>Loading search...</div>}>
          <PropertySearch />
        </Suspense>
      </div>
      
      {/* Footer: Pushed down by the flex-grow above */}
      <footer className="text-center text-xs text-muted-foreground py-6 w-full max-w-5xl mx-auto">
        <p>© 2025 Zap CRE - Designed and developed by <a href="https://danisik.tech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">danisik.tech</a></p>
      </footer>
    </main>
  );
}
