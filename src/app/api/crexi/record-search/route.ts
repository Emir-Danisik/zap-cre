import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const searchData = await request.json();
    
    if (!searchData.query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('searches')
      .insert([searchData])
      .select('id')
      .single();

    if (error) {
      console.error('Error recording search:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('Unexpected error recording search:', error);
    return NextResponse.json(
      { error: 'Failed to record search' },
      { status: 500 }
    );
  }
} 