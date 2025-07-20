import rateLimit from "express-rate-limit";

const rateLimiter = rateLimit({
  limit: 100, // Maximum number of requests
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: {message:"Too many requests, please try again later."},
});

const emailRateLimiter = rateLimit({
  limit: 5, // Maximum number of email requests
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: {message:"Too many email requests, please try again later."},
});

export { rateLimiter, emailRateLimiter };
