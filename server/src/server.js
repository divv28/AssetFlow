import dotenv from 'dotenv';
import app from './app.js';
import prisma from './config/db.js';
import { initScheduler } from './utils/scheduler.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to database and start server
const startServer = async () => {
  try {
    // Validate database connection
    await prisma.$connect();
    console.log('Successfully connected to the PostgreSQL database.');

    // Initialize daily overdue allocations checker
    initScheduler();

    const server = app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    // Initialize Socket.IO server
    const { initSocket } = await import('./config/socket.js');
    initSocket(server);

    // Handle graceful shutdowns
    const shutdown = async () => {
      console.log('Shutting down server gracefully...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Prisma Client disconnected. Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Database connection failed. Exiting process...', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! Shutting down...', err);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  process.exit(1);
});

startServer();
