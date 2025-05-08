const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // Optional: If you use .env for secrets

const supabaseUrl = 'https://wechfyubcqkbkfvnvgka.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlY2hmeXViY3FrYmtmdm52Z2thIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxOTk0MjAsImV4cCI6MjA1OTc3NTQyMH0.D1l-HwnCNBsQTe8w2_tx1sJgSX6pfmYijocf69nrquk';

const supabase = createClient(supabaseUrl, supabaseKey);

// GET all patients who have taken tests
router.get("/tests/patients", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tests")
      .select("patient:patient_id (patient_id, name, gender, age)");

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Failed to fetch test patients" });
    }

    const uniquePatientsMap = new Map();
    data.forEach((entry) => {
      if (entry.patient && !uniquePatientsMap.has(entry.patient.patient_id)) {
        uniquePatientsMap.set(entry.patient.patient_id, entry.patient);
      }
    });

    const uniquePatients = Array.from(uniquePatientsMap.values());
    res.status(200).json(uniquePatients);
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected error fetching unique test patients" });
  }
});

// GET pending tests for a patient
router.get("/pending-tests/:patientId", async (req, res) => {
  const { patientId } = req.params;

  try {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("patient_id", patientId)
      .is("test_result", null);

    if (error) {
      console.error("Error fetching pending tests:", error.message);
      return res.status(500).json({ error: "Failed to fetch pending tests" });
    }

    res.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected error fetching tests" });
  }
});

// POST update test results and notify doctor
router.post("/update-test-results", async (req, res) => {
  const { updates } = req.body;

  if (!updates || updates.length === 0) {
    return res.status(400).json({ message: "No test results provided." });
  }

  try {
    const { data, error } = await supabase
      .from("tests")
      .upsert(
        updates.map(({ test_id, test_result }) => ({
          test_id,
          test_result,
          result_arrival_date: new Date().toISOString(),
        }))
      );

    if (error) {
      console.error("Error updating test results:", error);
      return res.status(500).json({ message: "Error updating test results." });
    }

    const firstTestId = updates[0].test_id;
    const { data: testData, error: testError } = await supabase
      .from("tests")
      .select("patient_id")
      .eq("test_id", firstTestId)
      .single();

    if (testError) {
      console.error("Error fetching patient_id:", testError);
      return res.status(500).json({ message: "Error fetching patient ID." });
    }

    const patientId = testData.patient_id;
    const { data: patientData, error: patientError } = await supabase
      .from("patient")
      .select("doctor_id")
      .eq("patient_id", patientId)
      .single();

    if (patientError) {
      console.error("Error fetching doctor_id:", patientError);
      return res.status(500).json({ message: "Error fetching doctor ID." });
    }

    const doctorId = patientData.doctor_id;
    const { data: doctorData, error: doctorError } = await supabase
      .from("doctors")
      .select("email")
      .eq("id", doctorId)
      .single();

    if (doctorError) {
      console.error("Error fetching doctor email:", doctorError);
      return res.status(500).json({ message: "Error fetching doctor email." });
    }

    const doctorEmail = doctorData.email;

    const emailContent = updates
      .map(
        (update) =>
          `Test Name: ${update.test_name}\nTest ID: ${update.test_id}\nTest Result: ${update.test_result}`
      )
      .join("\n\n");

    const mailOptions = {
      from: "vamsipraneeth2004@gmail.com",
      to: doctorEmail,
      subject: "Test Results Updated",
      text: `Dear Doctor,\n\nThe following test results have been updated:\n\n${emailContent}\n\nBest regards,\nYour System`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Test results updated and email sent." });
  } catch (err) {
    console.error("Error handling test results update:", err);
    res.status(500).json({ message: "Failed to update test results." });
  }
});

module.exports = router;
