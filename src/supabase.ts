import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://uabbramsbfhsngtfjvkm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || 'sb_publishable_hsHfPJVR0sOHGS2KXjA2Jg_WihvCWpz';

export const supabase = createClient(supabaseUrl, supabaseKey);