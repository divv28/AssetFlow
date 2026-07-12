/**
 * Async handler utility to wrap Express routes and catch exceptions without try-catch blocks.
 * @param {Function} requestHandler 
 * @returns {Function}
 */
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandler };
