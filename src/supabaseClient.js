import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mtxcqzhddmjeooteliqq.supabase.co';
const supabaseAnonKey = 'sb_publishable_8ZlViG2-s5CgDyS8HSgOQw_Iju5thDS';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
