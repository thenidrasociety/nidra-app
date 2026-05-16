import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uabbramsbfhsngtfjvkm.supabase.co';
const supabaseKey = 'sb_publishable_hsHfPJVR0sOHGS2KXjA2Jg_WihvCWpz';

export const supabase = createClient(supabaseUrl, supabaseKey);