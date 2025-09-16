const mongoose = require("mongoose");

// Cache the connection to avoid reconnecting on every request
let cachedConnection = null;

const connectDB = async () => {
  // If we have a cached connection, use it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      cachedConnection = mongoose.connection;
      return cachedConnection;
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📂 Database Name: ${conn.connection.name}`);

    // Cache the connection
    cachedConnection = conn.connection;

    // Handle connection events (only in development)
    if (process.env.NODE_ENV !== "production") {
      mongoose.connection.on("error", (err) => {
        console.error(`❌ MongoDB connection error: ${err}`);
      });

      mongoose.connection.on("disconnected", () => {
        console.log("⚠️  MongoDB disconnected");
        cachedConnection = null;
      });
    }

    return cachedConnection;
  } catch (error) {
    console.error(`❌ Error connecting to MongoDB: ${error.message}`);
    cachedConnection = null;
    throw error; // Don't exit in serverless environment
  }
};

module.exports = connectDB;
