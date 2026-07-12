import { Server } from 'socket.io';

let io = null;
const userSockets = new Map(); // Maps User UUID to Socket ID

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] New connection established: ${socket.id}`);

    // Register user socket mapping
    socket.on('register', (userUuid) => {
      if (userUuid) {
        userSockets.set(userUuid, socket.id);
        console.log(`[Socket.IO] Registered User "${userUuid}" to socket: ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean up mapping
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`[Socket.IO] Cleaned up socket mapping for User: ${userId}`);
          break;
        }
      }
    });
  });

  return io;
};

/**
 * Dispatch real-time push notification if target user is online
 */
export const sendRealtimeNotification = (userId, notification) => {
  if (!io) {
    console.warn('[Socket.IO] Socket server not initialized yet.');
    return false;
  }

  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit('notification', notification);
    console.log(`[Socket.IO] Pushed live notification to user "${userId}"`);
    return true;
  }

  console.log(`[Socket.IO] User "${userId}" is offline. Saved to database only.`);
  return false;
};
