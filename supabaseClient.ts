import { createClient } from '@supabase/supabase-js';

// Replace with your actual env variable access method
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);




// import { createClient } from '@supabase/supabase-js';

// // Casting import.meta to any to avoid TypeScript error 'Property env does not exist on type ImportMeta'
// const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
// const supabaseKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

// if (!supabaseUrl || !supabaseKey) {
//   console.error('Missing Supabase environment variables. Please check your .env file.');
// }

// export const supabase = createClient(supabaseUrl || '', supabaseKey || '');