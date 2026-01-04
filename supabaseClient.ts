import { createClient } from '@supabase/supabase-js';

// Replace with your actual env variable access method
const supabaseUrl = 'https://yrehgfshjhcfyqcdgfod.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZWhnZnNoamhjZnlxY2RnZm9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODQ2NTQsImV4cCI6MjA4MjY2MDY1NH0.tMKGCmPEXGvJGLGSyEiXr91Hw5CMspxzZLkzPHmZCaE';

export const supabase = createClient(supabaseUrl, supabaseKey);