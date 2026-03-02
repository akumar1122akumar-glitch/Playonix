'use strict';

// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const redis = require('redis');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Validate required environment variables
const { PORT, MONGO_URI, REDIS_URI } = process.env;
if (!PORT || !MONGO_URI || !REDIS_URI) {
    console.error('Missing required environment variables');
    process.exit(1);
}

// Initialize Express app
const app = express();

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// Connect to Redis
const redisClient = redis.createClient(REDIS_URI);
redisClient.on('connect', () => console.log('Connected to Redis'));
redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
    process.exit(1);
});

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Parse JSON body
app.use(express.json());

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/users', require('./routes/users'));
app.use('/api/playlists', require('./routes/playlists'));
app.use('/api/premium', require('./routes/premium'));
app.use('/api/downloads', require('./routes/downloads'));
app.use('/api/recommendations', require('./routes/recommendations'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/billing', require('./routes/billing'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('An error occurred!');
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    mongoose.connection.close();
    redisClient.quit();
    process.exit(0);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
