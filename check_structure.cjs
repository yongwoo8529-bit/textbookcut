
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkillqpudliazhpaqole.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraWxscXB1ZGxpYXpocGFxb2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTQxNjYsImV4cCI6MjA4NjI5MDE2Nn0.6oqsy6PPCIh54GnUv1VDk3614c_yevTRQIB-qBOV5ef0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Listing Subjects...');
    const { data: subjects, error: sError } = await supabase.from('subjects').select('id, korean_name, subject_code');
    if (sError) console.error('Error listing subjects:', sError);
    else console.log('Subjects:', JSON.stringify(subjects, null, 2));

    console.log('Listing Units...');
    const { data: units, error: uError } = await supabase.from('units').select('id, unit_title, subject_id');
    if (uError) console.error('Error listing units:', uError);
    else console.log('Units count:', units.length);
}

check();
