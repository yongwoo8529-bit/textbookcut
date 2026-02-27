
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
    const { count, error } = await supabase
        .from('must_know_core')
        .select('*', { count: 'exact', head: true })
        .eq('subject', '국어');
    if (error) {
        console.error('Error counting data:', error);
    } else {
        console.log(`Total Korean concepts seeded: ${count}`);
    }
}

checkSchema();
