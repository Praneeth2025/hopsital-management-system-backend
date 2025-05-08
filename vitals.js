const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabaseUrl = 'https://wechfyubcqkbkfvnvgka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY2hmeXViY3FrYmtmdm52Z2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0MjAsImV4cCI6MjA1OTc3NTQyMH0.D1l-HwnCNBsQTe8w2_tx1sJgSX6pfmYijocf69nrquk';
const supabase = createClient(supabaseUrl, supabaseKey);


// Endpoint for updating vitals for multiple patients
router.post("/vitals/update", async (req, res) => {
  const vitalsArray = req.body;

  // Check if input is an array
  if (!Array.isArray(vitalsArray) || vitalsArray.length === 0) {
    return res.status(400).json({ error: "Invalid input format. Expected an array." });
  }

  // Validate and format each item
  const formattedVitals = vitalsArray.map((vital) => {
    const { patient_id, pulse, bloodPressure, temperature } = vital;

    if (!patient_id || !pulse || !bloodPressure || !temperature) {
      throw new Error("Missing required fields in one of the entries");
    }

    return {
      patient_id,
      pulse,
      blood_pressure: bloodPressure,
      temperature,
      monitoring_time: new Date().toISOString(),
    };
  });

  try {
    // Insert the vitals into the "health_monitoring" table
    const { data, error } = await supabase
      .from("health_monitoring")
      .insert(formattedVitals); // Insert instead of upsert

    if (error) {
      console.error("Error inserting vitals:", error);
      return res.status(500).json({ error: "Error inserting vitals", details: error });
    }

    res.status(200).json({ message: "Vitals updated successfully", data });
  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Unexpected error occurred" });
  }
});

module.exports = router;
