import { createClient } from '@supabase/supabase-js'; // Changed from supabase-api

// These should be your public credentials from the Supabase Dashboard
const supabaseUrl = 'https://rvpjyhqmixconqhyubkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cGp5aHFtaXhjb25xaHl1Ymt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMTIwMzcsImV4cCI6MjA4MjY4ODAzN30.oO59Ym2bjPcEx2BicoG69IpAfNJDknc0CMoyFjhE4Vk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10, // Adjust based on your app's needs
    },
  },
});