export default defineEventHandler((event) => {
  const allowedOrigins = [
    "https://devdashboard.proctor365.ai",
    "https://dashboard.proctor365.ai",
    "https://devauth.proctor365.ai",
    "https://auth.proctor365.ai",
    "https://adminapis.proctor365.ai",
    "https://devadminapis.proctor365.ai",
    "https://lti.proctor365.ai",
  ];

  const origin = getHeader(event, "origin");

  if (origin && allowedOrigins.includes(origin)) {
    setHeader(event, "Access-Control-Allow-Origin", origin);
    setHeader(event, "Vary", "Origin");
  }

  setHeader(event, "Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  setHeader(
    event,
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );
 // Content Security Policy
  setHeader(
    event,
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' https:",
      "connect-src 'self' https://adminapis.proctor365.ai https://devadminapis.proctor365.ai https://auth.proctor365.ai https://devauth.proctor365.ai",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join("; ")
  );

  // Additional Security Headers
  setHeader(event, "X-Content-Type-Options", "nosniff");
  setHeader(event, "X-Frame-Options", "SAMEORIGIN");
  setHeader(event, "Referrer-Policy", "strict-origin-when-cross-origin");
  setHeader(
    event,
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  setHeader(
    event,
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );
  if (getMethod(event) === "OPTIONS") {
    event.node.res.statusCode = 204;
    event.node.res.end();
  }
});