const express = require('express');
const app = express();

// Your route definitions
app.get('/doctors', (req, res) => {
  res.send('Doctors list');
});

app.get('/rooms/occupied', (req, res) => {
  res.send('Occupied rooms');
});

// ... define ALL other routes here

// Route listing function
const listRoutes = (app) => {
  if (!app._router || !app._router.stack) {
    console.log("No routes defined.");
    return;
  }

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const method = middleware.route.stack[0].method.toUpperCase();
      const path = middleware.route.path;
      console.log(`${method} ${path}`);
    }
  });
};

// ✅ Call this AFTER routes are added
listRoutes(app);

app.listen(3000, () => {
  console.log("aLASSSS running on port 3000");
});
