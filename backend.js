const express = require('express');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const bcrypt = require('bcryptjs');

app.use(cors());
app.use(express.json());
const supabaseUrl = 'https://wechfyubcqkbkfvnvgka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY2hmeXViY3FrYmtmdm52Z2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0MjAsImV4cCI6MjA1OTc3NTQyMH0.D1l-HwnCNBsQTe8w2_tx1sJgSX6pfmYijocf69nrquk';
const supabase = createClient(supabaseUrl, supabaseKey);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vamsipraneeth2004@gmail.com',  // Use your email here
    pass: 'mnux xved beeu rmso',  // Use your email password or app-specific password
  },
});



app.get('/doctors', async (req, res) => {
  const { data, error } = await supabase.from('doctors').select('*');
  if (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});


app.get('/schedules/completed', async (req, res) => {
  const { data, error } = await supabase.rpc('get_completed_schedules');
  if (error) {
    console.error('Supabase RPC error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`aLASSSS running on port ${port}`);
})