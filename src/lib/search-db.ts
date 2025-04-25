/**
 * Database service for search functionality
 * Records search queries and results in the database
 */

import { SearchRecord } from '@/types/crexi';
import { supabase } from './supabase';

/**
 * Record a search in the database
 * @param searchData Object containing search information
 * @returns The created search record
 */
export async function recordSearch(searchData: SearchRecord) {
  try {
    const response = await fetch('/api/crexi/record-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to record search');
    }

    return await response.json();
  } catch (error) {
    console.error('Unexpected error recording search:', error);
    return null;
  }
}


/**
 * Get searches for a specific user
 * @param userId User ID to get searches for
 * @returns Array of search records
 */
export async function getUserSearches(userId: string) {
  try {
    const { data, error } = await supabase
      .from('searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user searches:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching user searches:', error);
    return [];
  }
} 