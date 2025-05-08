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


app.get('/schedules/checkup', async (req, res) => {
  const { data, error } = await supabase.rpc('get_pending_or_inside_schedules');
  if (error) {
    console.error('Supabase RPC error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});







app.get('/api/patients/:patientId', async (req, res) => {
  const { patientId } = req.params;
  console.log('Received patientId:', patientId);

  try {
    const { data: patient, error: patientError } = await supabase
      .from('patient')
      .select(`
        name,
        age,
        mobile_number,
        problem_description,
        allergies,
        current_medicines,
        doctor_id,
        doctors(full_name)
      `)
      .eq('patient_id', patientId)
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const { data: medicines } = await supabase
      .from('medicines')
      .select('medicine_name, dosage, time_to_use')
      .eq('patient_id', patientId);

    const { data: tests } = await supabase
      .from('tests')
      .select('test_name, test_result, test_date, result_arrival_date')
      .eq('patient_id', patientId);

    const { data: roomData } = await supabase
      .from('room')
      .select('room_id')
      .eq('patient_id', patientId)
      .single();

    const { data: vitals } = await supabase
      .from('health_monitoring')
      .select('pulse, blood_pressure, temperature, monitoring_time')
      .eq('patient_id', patientId);

    const responseData = {
      name: patient.name,
      age: patient.age,
      mobilenum: patient.mobile_number,
      problem_description: patient.problem_description,
      allergies: patient.allergies,
      current_medicines: patient.current_medicines,
      current_doctor: patient.doctors?.full_name || 'N/A',
      room_no: roomData?.room_id ? `Room ${roomData.room_id}` : 'Not Assigned',
      medicines: medicines || [],
      tests: tests || [],
      vitals: vitals || [],
    };

    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(responseData);
  } catch (err) {
    console.error('Error fetching patient details:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/schedules/turn-in', async (req, res) => {
  console.log('🎯 Request body:', req.body);
  const { patient_ids } = req.body;

  if (!Array.isArray(patient_ids) || patient_ids.length === 0) {
    console.warn('⚠ Invalid patient_ids array');
    return res.status(400).json({ error: "Invalid patient_ids array" });
  }

  try {
    const { data, error } = await supabase.rpc(
      'update_schedule_status_to_completed',
      { p_patient_ids: patient_ids }
    );

    if (error) {
      console.error('❌ Supabase RPC error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ message: "Successfully updated status to Completed" });
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    return res.status(500).json({ error: err.message });
  }
});



app.post('/update-test-results', async (req, res) => {
  const { updates } = req.body; // Extract updates from request
  console.log(updates); // Log to see the updates structure

  if (!updates || updates.length === 0) {
    return res.status(400).json({ message: 'No test results provided.' });
  }

  try {
    // Process each update (upsert into the database)
    const { data, error } = await supabase
      .from('tests')
      .upsert(
        updates.map(({ test_id, test_result }) => ({
          test_id,
          test_result,
          result_arrival_date: new Date().toISOString(), // Current date
        }))
      );

    if (error) {
      console.error('Error updating test results:', error);
      return res.status(500).json({ message: 'Error updating test results.' });
    }

    const firstTestId = updates[0].test_id;

    // Fetch the patient_id associated with the first test_id
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('patient_id')
      .eq('test_id', firstTestId)
      .single(); // Use .single() to get a single result

    if (testError) {
      console.error('Error fetching patient_id:', testError);
      return res.status(500).json({ message: 'Error fetching patient ID.' });
    }

    const patientId = testData.patient_id;
    console.log('Patient ID:', patientId);

    // Fetch the doctor_id from the patient table using the patient_id
    const { data: patientData, error: patientError } = await supabase
      .from('patient')
      .select('doctor_id')
      .eq('patient_id', patientId)
      .single();

    if (patientError) {
      console.error('Error fetching doctor_id:', patientError);
      return res.status(500).json({ message: 'Error fetching doctor ID.' });
    }

    const doctorId = patientData.doctor_id;
    console.log('Doctor ID:', doctorId);

    // Fetch the doctor's email from the doctors table using the doctor_id
    const { data: doctorData, error: doctorError } = await supabase
      .from('doctors')
      .select('email')
      .eq('id', doctorId)
      .single();

    if (doctorError) {
      console.error('Error fetching doctor email:', doctorError);
      return res.status(500).json({ message: 'Error fetching doctor email.' });
    }

    const doctorEmail = doctorData.email;
    console.log('Doctor Email:', doctorEmail);

    // Construct the email content based on the updates
    const emailContent = updates.map((update) => {
      return `Test Name: ${update.test_name}\nTest ID: ${update.test_id}\nTest Result: ${update.test_result}\n`;
    }).join('\n');

    // Prepare the email details
    const mailOptions = {
      from: 'vamsipraneeth2004@gmail.com',
      to: doctorEmail,  // Send email to the fetched doctor's email
      subject: 'Test Results Updated',
      text: `Dear Doctor,\n\nThe following test results have been updated:\n\n${emailContent}\n\nPlease review them.\n\nBest regards, Your System`,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log('✅ Email sent to doctor:', doctorEmail);

    res.status(200).json({ message: 'Test results updated and email sent.' });
  } catch (err) {
    console.error('Error handling test results update:', err);
    return res.status(500).json({ message: 'Failed to update test results.' });
  }
});






app.get("/api/doctors", async (req, res) => {
    try {
      // Set headers to prevent caching
      res.setHeader("Cache-Control", "no-store");  // This disables caching
  
      // Fetch all doctors from the database
      const { data, error } = await supabase.from("doctors").select("*");
  
      if (error) {
        return res.status(500).json({ error: "Failed to fetch doctors" });
      }
      console.log("Fetched doctors:", data); // Log the fetched data
      res.status(200).json(data);
    } catch (err) {
      console.error("Error fetching doctors:", err);
      res.status(500).json({ error: "Server error" });
    }
  });

app.get('/schedules/checkup', async (req, res) => {
  const { data, error } = await supabase.rpc('get_pending_or_inside_schedules');

  if (error) {
    console.error('Supabase RPC error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});
// GET: /schedules/completed
app.get('/schedules/completed', async (req, res) => {
  const { data, error } = await supabase.rpc('get_completed_schedules');

  if (error) {
    console.error('Supabase RPC error:', error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});
app.get("/pending-tests/:patientId", async (req, res) => {
  const { patientId } = req.params;

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
});

app.get('/rooms/occupied', async (req, res) => {
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

    // Format data to flatten patient name
    const formatted = data.map((room) => ({
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






app.post('/api/login', async (req, res) => {
  const { email, password, role } = req.body;
  console.log(email);
  console.log(typeof(password));
  console.log(role);
  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Email, password, and role are required.' });
  }

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('role', role)
      .limit(1);

    if (error) throw error;
    

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
   
    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error. Please try again later.' });
  }
});

app.delete('/schedules/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Call the Supabase function and pass patient_id
    const { error } = await supabase.rpc('delete_patients_appointment', {
      p_patient_id: parseInt(id)
    });

    if (error) {
      console.error('Supabase RPC error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`Successfully deleted patient with ID: ${id}`);
    res.status(200).json({ message: 'Patient and related records deleted successfully' });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post("/api/appointments", async (req, res) => {
  try {
    const {
      name,
      age,
      gender,
      mobile_number,
      email_id,
      address,
      guardian_name,
      guardian_mobile_number,
      problem_description,
      allergies,
      current_medicines,
      specialist,
      doctor_id,
      selected_date,
      selected_time
    } = req.body;

    // Check if required fields are provided
    if (!name || !mobile_number || !selected_date || !selected_time || !doctor_id) {
      return res.status(400).json({ error: "Missing required fields!" });
    }

    const selectedTime = new Date(`1970-01-01T${selected_time}:00Z`);
    selectedTime.setMinutes(selectedTime.getMinutes() + 15);
    const end_time = selectedTime.toISOString().substring(11, 16); // Convert back to HH:mm format

    // Insert patient data into the 'patient' table
    const { data: patientData, error: patientError } = await supabase
      .from("patient")
      .insert([
        {
          name,
          age,
          gender,
          mobile_number,
          email_id,
          address,
          guardian_name,
          guardian_mobile_number,
          problem_description,
          allergies,
          current_medicines,
          doctor_id
        }
      ])
      .select();

    if (patientError) throw patientError;

    const patient_id = patientData[0].patient_id; // Get the inserted patient ID

    // Insert doctor schedule
    const { error: scheduleError } = await supabase
      .from("doctor_schedule")
      .insert([
        {
          doctor_id,
          patient_id,
          schedule_date: selected_date,
          start_time: selected_time,
          end_time,
          schedule_type: 'Checkup',
        }
      ]);

    if (scheduleError) throw scheduleError;

    // Create appointment entry (default status 'Pending')
    const { error: appointmentError } = await supabase
      .from("appointment")
      .insert([
        {
          patient_id,
          status: 'Pending', // default status
          date_of_appointment: selected_date
        }
      ]);

    if (appointmentError) throw appointmentError;

    res.status(201).json({ message: "Appointment created successfully!" });

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Failed to create appointment" });
  }
});

app.post('/api/signup', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into 'users' table
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, role }]);

    if (error) {
      throw error;
    }

    res.status(201).json({ message: 'User signed up successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove user route
app.post('/api/remove', async (req, res) => {
  const { email } = req.body;

  try {
    // Delete user by email from 'users' table
    const { data, error } = await supabase
      .from('users')
      .delete()
      .eq('email', email);

    if (error) {
      throw error;
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



app.post("/medicines/upload", async (req, res) => {
  try {
    const { medicines } = req.body; // Only expect "medicines" now, as patient_id is included inside

    // Log the received data for debugging
    console.log("Received medicines:", medicines);

    // Validate the input data
    if (!Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    // Insert the medicines data into the "medicines" table in Supabase
    const { data, error } = await supabase
      .from("medicines")
      .insert(medicines)
      .select(); // Optional, returns inserted rows

    // Handle any errors during the insert
    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ message: "Upload failed", error });
    }

    // Return a success response
    res.status(201).json({ message: "Medicines uploaded successfully", data });
  } catch (err) {
    // Catch any other unexpected errors
    console.error("Server Error:", err);
    res.status(500).json({ message: "Unexpected server error", error: err.message });
  }
});
app.post("/rooms/discharge", async (req, res) => {
  const { room_id, patient_id } = req.body;

  // Check if room_id and patient_id are provided
  if (!room_id || !patient_id) {
    return res.status(400).json({ error: "Room ID and Patient ID are required." });
  }

  try {
    // Update the room status to Vacant and clear the patient_id
    const { data, error } = await supabase
      .from("room") // Assuming your table is named "room"
      .update({
        status: "Vacant",
        patient_id: null,
        assigned_time: null // Clear the patient_id
      })
      .eq("room_id", room_id) // Match the room_id
      .eq("patient_id", patient_id); // Ensure the patient_id matches

    if (error) {
      return res.status(500).json({ error: "Failed to discharge patient." });
    }

    // Successfully discharged, respond with success message
    return res.status(200).json({ message: "Patient discharged and room status updated." });
  } catch (err) {
    console.error("Error discharging patient:", err);
    return res.status(500).json({ error: "Error discharging patient." });
  }
});

app.post("/tests/upload", async (req, res) => {
  try {
    const { tests } = req.body;

    console.log("Received tests:", tests);

    // Validate input
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ message: "Invalid data format" });
    }

    // Set test_date to today if not provided
    const preparedTests = tests.map(test => ({
      ...test,
      test_date: test.test_date || new Date().toISOString(), // Defaults to current date
    }));

    // Insert into the "tests" table
    const { data, error } = await supabase
      .from("tests")
      .insert(preparedTests)
      .select(); // Optional: returns inserted rows

    if (error) {
      console.error("Supabase Error:", error.message);
      return res.status(500).json({ message: "Upload failed", error });
    }

    res.status(201).json({ message: "Tests uploaded successfully", data });
  } catch (err) {
    console.error("Server Error:", err);
    res.status(500).json({ message: "Unexpected server error", error: err.message });
  }
});




app.get("/medicines", async (req, res) => {
  try {
    // Query the medicine_cost table
    const { data, error } = await supabase
      .from("medicine_cost")
      .select("*"); // Select all fields from the table

    if (error) {
      console.error("Error fetching medicines:", error);
      return res.status(500).json({ error: "Database error" });
    }

    // Send the data as a JSON response
    res.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});

app.get("/rooms", async (req, res) => {
  try {
    // Query the room table
    const { data, error } = await supabase
      .from("room")
      .select("*"); // Select all fields from the room table

    if (error) {
      console.error("Error fetching rooms:", error);
      return res.status(500).json({ error: "Database error" });
    }

    // Send the room data as a JSON response
    res.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});

app.post("/rooms/assign", async (req, res) => {
  const { room_id, patient_id } = req.body;

  // Ensure that both room_id and patient_id are provided
  if (!room_id || !patient_id) {
    return res.status(400).json({ error: "Room ID and Patient ID are required." });
  }

  try {
    // Perform the room update query to assign the room
    const { data, error } = await supabase
      .from("room")
      .update({
        status: "Occupied",
        patient_id: patient_id,
        assigned_time: new Date(), // Current timestamp
      })
      .eq("room_id", room_id) // Target room
      .eq("status", "Vacant"); // Only update if room is Vacant

    if (error) {
      return res.status(500).json({ error: "Failed to assign room." });
    }

    return res.status(200).json({ message: "Room assigned successfully", data });
  } catch (err) {
    console.error("Error assigning room:", err);
    return res.status(500).json({ error: "Error assigning room." });
  }
});

app.get("/tests", async (req, res) => {
  try {
    // Query the test_cost table
    const { data, error } = await supabase
      .from("test_cost")
      .select("*"); // Select all fields from the table

    if (error) {
      console.error("Error fetching tests:", error);
      return res.status(500).json({ error: "Database error" });
    }

    // Send the data as a JSON response
    res.json(data);
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected error occurred" });
  }
});



app.post("/vitals/update", async (req, res) => {
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



app.get("/tests/patients", async (req, res) => {
  try {
    // Step 1: Fetch all patients who have tests
    const { data, error } = await supabase
      .from("tests")
      .select("patient:patient_id (patient_id, name, gender, age)");

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Failed to fetch test patients" });
    }

    // Step 2: Deduplicate patients by patient_id
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



app.get("/pending-_tests/:patient_id", async (req, res) => {
  const patient_id = req.params.patient_id;

  try {
    // Query to fetch tests where test_result is NULL for the given patient_id
    const { data, error } = await supabase
      .from('tests') // Assuming your table is called 'tests'
      .select('*')
      .eq('patient_id', patient_id)
      .is('test_result', null);

    if (error) {
      console.error('Error fetching pending tests:', error);
      return res.status(500).json({ message: 'Error fetching pending tests.' });
    }

    // Check if no pending tests are found
    if (data.length === 0) {
      return res.status(404).json({ message: 'No pending tests found for this patient.' });
    }

    // Return the list of pending tests
    res.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    return res.status(500).json({ message: 'Unexpected error occurred.' });
  }
});






const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`aLASSSS running on port ${port}`);
})