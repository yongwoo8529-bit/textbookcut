
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const envPath = path.join(process.cwd(), '.env');
    const env = fs.readFileSync(envPath, 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

    if (!urlMatch || !keyMatch) return;

    const url = urlMatch[1].trim();
    const key = keyMatch[1].trim().replace(/\s+/g, '');

    const supabase = createClient(url, key);

    console.log('Fetching all must_know_core rows...');
    const { data, error } = await supabase.from('must_know_core').select('title, subject').limit(100);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('Concept Titles:');
    data.forEach(d => console.log(`- [${d.subject}] ${d.title}`));
}

run();
