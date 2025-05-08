// testandmedicines.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = 'https://wechfyubcqkbkfvnvgka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY2hmeXViY3FrYmtmdm52Z2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0MjAsImV4cCI6MjA1OTc3NTQyMH0.D1l-HwnCNBsQTe8w2_tx1sJgSX6pfmYijocf69nrquk';
const supabase = createClient(supabaseUrl, supabaseKey);

// Get completed schedules
router.get('/schedules/completed', async (req, res) => {
  const { data, error } = await supabase.rpc('get_completed_schedules');
  if (error) {
    console.error('Supabase RPC error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// Get all medicines (cost info)
router.get('/medicines', async (req, res) => {
  try {
    const { data, error } = await supabase.from('medicine_cost').select('*');
    if (error) {
      console.error('Error fetching medicines:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Unexpected error occurred' });
  }
});

// Get all tests (cost info)
router.get('/tests', async (req, res) => {
  try {
    const { data, error } = await supabase.from('test_cost').select('*');
    if (error) {
      console.error('Error fetching tests:', error);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Unexpected error occurred' });
  }
});

// Upload medicines
router.post('/medicines/upload', async (req, res) => {
  try {
    const { medicines } = req.body;
    console.log('Received medicines:', medicines);

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const { data, error } = await supabase
      .from('medicines')
      .insert(medicines)
      .select();

    if (error) {
      console.error('Supabase Error:', error.message);
      return res.status(500).json({ message: 'Upload failed', error });
    }

    res.status(201).json({ message: 'Medicines uploaded successfully', data });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Unexpected server error', error: err.message });
  }
});

// Upload tests
router.post('/tests/upload', async (req, res) => {
  try {
    const { tests } = req.body;
    console.log('Received tests:', tests);

    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ message: 'Invalid data format' });
    }

    const preparedTests = tests.map(test => ({
      ...test,
      test_date: test.test_date || new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('tests')
      .insert(preparedTests)
      .select();

    if (error) {
      console.error('Supabase Error:', error.message);
      return res.status(500).json({ message: 'Upload failed', error });
    }

    res.status(201).json({ message: 'Tests uploaded successfully', data });
  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ message: 'Unexpected server error', error: err.message });
  }
});

module.exports = router;
