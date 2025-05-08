// bookroom.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = 'https://wechfyubcqkbkfvnvgka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY2hmeXViY3FrYmtmdm52Z2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0MjAsImV4cCI6MjA1OTc3NTQyMH0.D1l-HwnCNBsQTe8w2_tx1sJgSX6pfmYijocf69nrquk';
const supabase = createClient(supabaseUrl, supabaseKey);

// Discharge a patient and make room vacant
router.post('/rooms/discharge', async (req, res) => {
  const { room_id, patient_id } = req.body;

  if (!room_id || !patient_id) {
    return res.status(400).json({ error: 'Room ID and Patient ID are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('room')
      .update({
        status: 'Vacant',
        patient_id: null,
        assigned_time: null
      })
      .eq('room_id', room_id)
      .eq('patient_id', patient_id);

    if (error) {
      return res.status(500).json({ error: 'Failed to discharge patient.' });
    }

    return res.status(200).json({ message: 'Patient discharged and room status updated.' });
  } catch (err) {
    console.error('Error discharging patient:', err);
    return res.status(500).json({ error: 'Error discharging patient.' });
  }
});

// Get all rooms
router.get('/rooms', async (req, res) => {
  try {
    const { data, error } = await supabase.from('room').select('*');

    if (error) {
      console.error('Error fetching rooms:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Unexpected error occurred' });
  }
});

// Get completed schedules
router.get('/schedules/completed', async (req, res) => {
  const { data, error } = await supabase.rpc('get_completed_schedules');

  if (error) {
    console.error('Supabase RPC error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// Get occupied rooms with patient names
router.get('/rooms/occupied', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('room')
      .select(`
        room_id,
        patient_id,
        assigned_time,
        status,
        patient (
          name
        )
      `)
      .eq('status', 'Occupied');

    if (error) {
      console.error('Error fetching occupied rooms:', error);
      return res.status(500).json({ error: error.message });
    }

    const formatted = data.map(room => ({
      room_id: room.room_id,
      patient_id: room.patient_id,
      assigned_time: room.assigned_time,
      patient_name: room.patient?.name || 'N/A',
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Assign a patient to a room
router.post('/rooms/assign', async (req, res) => {
  const { room_id, patient_id } = req.body;

  if (!room_id || !patient_id) {
    return res.status(400).json({ error: 'Room ID and Patient ID are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('room')
      .update({
        status: 'Occupied',
        patient_id: patient_id,
        assigned_time: new Date(),
      })
      .eq('room_id', room_id)
      .eq('status', 'Vacant');

    if (error) {
      return res.status(500).json({ error: 'Failed to assign room.' });
    }

    return res.status(200).json({ message: 'Room assigned successfully', data });
  } catch (err) {
    console.error('Error assigning room:', err);
    return res.status(500).json({ error: 'Error assigning room.' });
  }
});

module.exports = router;
