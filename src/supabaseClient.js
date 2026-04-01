import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mtxcqzhddmjeooteliqq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_8ZlViG2-s5CgDyS8HSgOQw_Iju5thDS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
