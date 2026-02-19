
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

    console.log('Fetching unique subject values...');
    const { data, error } = await supabase.from('must_know_core').select('subject');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const subjects = [...new Set(data.map(d => d.subject))];
    console.log('Unique subjects in must_know_core:', subjects);
}

run();
