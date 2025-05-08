// app.js
const express = require('express');
const cors = require('cors');
const loginRoute = require('./loginRoute');
const testAndMedicinesRoutes = require('./testandmedicines');
const bookRoomRoutes = require('./bookroom');
const vitalsRouter = require('./vitals');
const testResultsRoutes = require('./testresults');


const app = express();
app.use(cors());
app.use(express.json());

loginRoute(app); // Just plug it in
app.use(testAndMedicinesRoutes);
app.use(bookRoomRoutes);
app.use(vitalsRouter);
app.use('/', testResultsRoutes);



app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
