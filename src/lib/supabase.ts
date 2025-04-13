import { createClient } from '@supabase/supabase-js';

// These would typically come from environment variables
// For demonstration, using placeholders - replace with actual values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

export const supabase = createClient(supabaseUrl, supabaseKey); 