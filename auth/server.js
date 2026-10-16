require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

// Connect to MongoDB
connectDB();

app.listen(process.env.SERVER_PORT, () => {
  console.log(`Auth Server is running on port ${process.env.SERVER_PORT}`);
});

