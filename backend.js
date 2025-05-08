const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

// Supabase credentials
const supabaseUrl = 'https://wechfyubcqkbkfvnvgka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY2hmeXViY3FrYmtmdm52Z2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0MjAsImV4cCI6MjA1OTc3NTQyMH0.D1l-HwnCNBsQTe8w2_tx1sJgSX6pfmYijocf69nrquk'; // Replace with your actual key
const supabase = createClient(supabaseUrl, supabaseKey);

// 🔁 Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('✅ Server is running');
});

// ✅ Get all doctors
app.get('/api/doctors', async (req, res) => {
  const { data, error } = await supabase.from('doctors').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ✅ Get completed schedules using RPC
app.get('/api/schedules/completed', async (req, res) => {
  const { data, error } = await supabase.rpc('get_completed_schedules');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ✅ Get patient details by ID
app.get('/api/patients/:patientId', async (req, res) => {
  const { patientId } = req.params;

  const { data: patient, error } = await supabase
    .from('patient')
    .select(`
      name, age, mobile_number, problem_description,
      allergies, current_medicines, doctor_id,
      doctors(full_name)
    `)
    .eq('patient_id', patientId)
    .single();

  if (error || !patient) return res.status(404).json({ error: 'Patient not found' });

  res.json({
    name: patient.name,
    age: patient.age,
    mobile: patient.mobile_number,
    doctor: patient.doctors?.full_name || 'N/A',
  });
});

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`);
});
