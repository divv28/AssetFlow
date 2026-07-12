import { contextStore } from '../utils/contextStore.js';

export const requestContextMiddleware = (req, res, next) => {
  const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const browser = req.headers['user-agent'] || 'Unknown Browser';

  // Run subsequent middlewares and routes inside this AsyncLocalStorage scope
  contextStore.run({ user: null, ipAddress, browser }, () => {
    next();
  });
};

/**
 * Helper to update user in current context after JWT authorization
 */
export const setContextUser = (user) => {
  const store = contextStore.getStore();
  if (store) {
    store.user = user;
  }
};
