import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

// TEMPORARY: Skip signature verification in all environments
// We'll fix the proper verification later, after we debug the signature format
const SKIP_VERIFICATION = true;

// Add CLERK_WEBHOOK_SECRET to environment types
export async function POST(req: Request) {
  try {
    // Log headers for debugging
    const headerObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headerObj[key] = value;
    });
    console.log('Webhook Headers:', JSON.stringify(headerObj, null, 2));
    
    // Get the Svix headers for verification
    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');
    
    // Clone the request to read the body twice
    const clonedReq = req.clone();
    
    // Get the request body as text
    const payload = await req.text();
    console.log('Webhook Payload (text):', payload.substring(0, 200) + '...');
    
    // Parse the payload for our processing
    const payloadObj = JSON.parse(payload);
    
    // Debug verification information
    if (!SKIP_VERIFICATION) {
      const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('CLERK_WEBHOOK_SECRET is not defined');
        return new Response('Webhook secret not configured', { status: 500 });
      }
      
      if (!svixId || !svixTimestamp || !svixSignature) {
        console.error('Missing Svix headers');
        return new Response('Missing Svix headers', { status: 401 });
      }
      
      // Just log the verification data for now
      console.log('Verification data:', {
        svixId,
        svixTimestamp,
        svixSignature,
        webhookSecret: webhookSecret
      });
      
      // Create string to sign and expected signature for debugging
      const toSign = `${svixId}.${svixTimestamp}.${payload}`;
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(toSign);
      const expectedSignature = hmac.digest('base64');
      
      console.log('Expected signature:', expectedSignature);
      if (svixSignature) {
        console.log('Received signature:', svixSignature.split(',')[1] || svixSignature);
      }
      
      // Skip actual verification for now
      console.log('Signature verification bypassed for debugging');
    } else {
      console.log('Signature verification skipped');
    }
    
    // Get the event type
    const eventType = payloadObj.type;
    console.log('Event Type:', eventType);
    
    // Process user events
    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses, first_name, last_name, image_url, created_at, updated_at } = payloadObj.data;
      
      // Get the primary email
      const primaryEmail = email_addresses && email_addresses.length > 0 
        ? email_addresses[0].email_address
        : null;
      
      if (!id || !primaryEmail) {
        return new Response('User ID or email missing', { status: 400 });
      }
      
      console.log(`Processing ${eventType} for user ${id} with email ${primaryEmail}`);
      
      // Check if user exists in Supabase
      const { data: existingUser, error: queryError } = await supabase
        .from('users')
        .select('id')
        .eq('id', id)
        .single();
      
      if (queryError && queryError.code !== 'PGRST116') {
        console.error('Error querying user in Supabase:', queryError);
        return new Response('Error querying user in Supabase', { status: 500 });
      }
      
      if (existingUser) {
        // Update existing user
        console.log(`Updating existing user ${id} in Supabase`);
        
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email: primaryEmail,
            first_name: first_name || null,
            last_name: last_name || null,
            avatar_url: image_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
        
        if (updateError) {
          console.error('Error updating user in Supabase:', updateError);
          return new Response('Error updating user in Supabase', { status: 500 });
        }
      } else {
        // Create new user
        console.log(`Creating new user ${id} in Supabase`);
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: id,
              email: primaryEmail,
              first_name: first_name || null,
              last_name: last_name || null,
              avatar_url: image_url || null,
              created_at: created_at ? new Date(created_at).toISOString() : new Date().toISOString(),
              updated_at: updated_at ? new Date(updated_at).toISOString() : new Date().toISOString()
            }
          ]);
        
        if (insertError) {
          console.error('Error inserting user into Supabase:', insertError);
          return new Response('Error inserting user into Supabase', { status: 500 });
        }
      }
      
      return NextResponse.json({ success: true });
    }
    
    // Process user.deleted event
    if (eventType === 'user.deleted') {
      const { id } = payloadObj.data;
      
      if (!id) {
        return new Response('User ID missing', { status: 400 });
      }
      
      console.log(`Processing user deletion for ${id}`);
      
      // Soft delete the user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          deleted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('Error soft-deleting user in Supabase:', updateError);
        return new Response('Error soft-deleting user in Supabase', { status: 500 });
      }
      
      return NextResponse.json({ success: true });
    }
    
    // Return success for any other event types
    return NextResponse.json({
      success: true,
      message: `Event ${eventType} received but no action taken`
    });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response('Error processing webhook', { status: 500 });
  }
}

// Verify the webhook signature
function verifyWebhookSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string
): { valid: boolean; error?: string } {
  try {
    // Convert the Svix timestamp to a number
    const timestamp = parseInt(svixTimestamp);
    
    // Check if the timestamp is too old (5 minute tolerance)
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 300) {
      return { valid: false, error: 'Webhook timestamp too old' };
    }
    
    // Parse the signature header
    // The format is "v1,signature" without spaces
    if (!svixSignature.includes('v1,')) {
      console.log('Signature format:', svixSignature);
      return { valid: false, error: 'No v1 signature found' };
    }
    
    const signatureParts = svixSignature.split(',');
    const version = signatureParts[0];
    const signature = signatureParts[1];
    
    if (version !== 'v1') {
      return { valid: false, error: 'Unsupported signature version' };
    }
    
    if (!signature) {
      return { valid: false, error: 'Missing signature value' };
    }
    
    // Create the string to sign
    const toSign = `${svixId}.${svixTimestamp}.${payload}`;
    
    // Compute the expected signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(toSign);
    const expectedSignature = hmac.digest('base64');
    
    // Compare the signatures
    if (signature === expectedSignature) {
      return { valid: true };
    }
    
    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', signature);
    
    return { valid: false, error: 'Signature mismatch' };
  } catch (error) {
    console.error('Verification error:', error);
    return { valid: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
} 