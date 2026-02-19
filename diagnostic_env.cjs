
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    const envPath = path.join(process.cwd(), '.env');
    const env = fs.readFileSync(envPath, 'utf8');
    const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
    const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

    if (!urlMatch || !keyMatch) {
        console.error('Could not find Supabase URL or Key in .env');
        return;
    }

    const url = urlMatch[1].trim();
    const key = keyMatch[1].trim().replace(/\s+/g, ''); // Remove any weird spaces

    console.log('Using URL:', url);
    console.log('Key length:', key.length);

    const supabase = createClient(url, key);

    console.log('Querying must_know_core subjects...');
    const { data, error } = await supabase.from('must_know_core').select('title, units(subjects(korean_name))');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts = {};
    data.forEach(row => {
        const subject = row.units?.subjects?.korean_name || 'unknown';
        counts[subject] = (counts[subject] || 0) + 1;
    });

    console.log('Counts per subject:', JSON.stringify(counts, null, 2));
}

run();
