"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from "next/image";
import Link from 'next/link';
import { useAuth, useUser, UserButton } from '@clerk/nextjs';

const Header: React.FC = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  // Don't render header until Clerk is loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
    >
      <div className="max-w-[1400px] mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo on the left */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <Image 
              src="/logo.png" 
              alt="ZAP CRE Logo" 
              width={42} 
              height={36} 
              className="rounded-lg mr-2 border border-secondary"
            />
            <span className="font-semibold text-lg">Zap CRE</span>
          </Link>
        </div>
        
        {/* User Info & Button on the right */}
        {isSignedIn && (
          <div className="flex items-center space-x-3">
            {user && (user.firstName || user.fullName || user.username) && (
              <span className="text-sm font-medium hidden sm:inline">
                {user.firstName || user.fullName || user.username}
            </span>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
        
        {/* Optional: Add Sign In/Sign Up links if not signed in */}
        {!isSignedIn && (
          <div className="flex items-center space-x-4">
            <Link href="/sign-in" className="text-sm font-medium hover:text-primary">
              Sign In
            </Link>
            <Link href="/sign-up" className="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              Sign Up
            </Link>
            </div>
          )}
      </div>
    </motion.header>
  );
};

export default Header; 