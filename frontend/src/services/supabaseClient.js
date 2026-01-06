import { createClient } from '@supabase/supabase-js'; // Changed from supabase-api

// These should be your public credentials from the Supabase Dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // Adjust based on your app's needs
    },
  },
});