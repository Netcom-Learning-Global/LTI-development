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

  if (getMethod(event) === "OPTIONS") {
    event.node.res.statusCode = 204;
    event.node.res.end();
  }
});