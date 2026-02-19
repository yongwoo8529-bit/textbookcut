
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lkillqpudliazhpaqole.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxraWxscXB1ZGxpYXpocGFxb2xlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MTQxNjYsImV4cCI6MjA4NjI5MDE2Nn0.6oqsy6PPCIh54GnUv1VDk3614c_yevTRQIB-qBOV5ef0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log('Checking must_know_core subject counts...');
    const { data, error } = await supabase
        .from('must_know_core')
        .select('subject');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const counts = data.reduce((acc, row) => {
        acc[row.subject] = (acc[row.subject] || 0) + 1;
        return acc;
    }, {});

    console.log('Subject counts in must_know_core:');
    console.log(JSON.stringify(counts, null, 2));

    const { data: traps } = await supabase.from('exam_trap_points').select('id');
    console.log('Total trap points:', traps?.length || 0);

    const { data: graphs } = await supabase.from('graph_patterns').select('id');
    console.log('Total graph patterns:', graphs?.length || 0);

    const { data: calcs } = await supabase.from('calculation_focus').select('id');
    console.log('Total calculation focus:', calcs?.length || 0);
}

check();
