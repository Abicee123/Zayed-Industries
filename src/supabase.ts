import { createClient } from '@supabase/supabase-js';

// Replace these with the actual URL and Key from your Supabase dashboard
const supabaseUrl = 'https://blaxocbogkkkxjqluypg.supabase.co';
const supabaseAnonKey = 'sb_publishable_wxvI4Wzb3--8lPo8qU7mqw_8ublO81X';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);