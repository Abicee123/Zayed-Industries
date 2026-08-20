import { createClient } from "@supabase/supabase-js";

// Export the keys so the secondary auth client can use them in the Employees page
export const supabaseUrl = 'https://blaxocbogkkkxjqluypg.supabase.co';
export const supabaseKey = 'sb_publishable_wxvI4Wzb3--8lPo8qU7mqw_8ublO81X';

// The primary client for the application
export const supabase = createClient(supabaseUrl, supabaseKey);