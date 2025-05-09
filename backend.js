const express = require('express');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Supabase Setup
const supabaseUrl = 'https://wechfyubcqkbkfvnvgka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY2hmeXViY3FrYmtmdm52Z2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0MjAsImV4cCI6MjA1OTc3NTQyMH0.D1l-HwnCNBsQTe8w2_tx1sJgSX6pfmYijocf69nrquk';  // Keep secure
const supabase = createClient(supabaseUrl, supabaseKey);

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'vamsipraneeth2004@gmail.com',
    pass: 'mnux xved beeu rmso', // App-specific password
  },
});

// Route: Get All Doctors
app.get('/doctors', async (req, res) => {
  const { data, error } = await supabase.from('doctors').select('*');
  if (error) {
    console.error('Error fetching doctors:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Route: Get Completed Checkup Schedules
app.get('/schedules/completed', async (req, res) => {
  // Assuming you created a Supabase function named 'get_completed_checkups'
  const { data, error } = await supabase.rpc('get_completed_checkups');
  if (error) {
    console.error('Error fetching completed schedules:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Start Server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
