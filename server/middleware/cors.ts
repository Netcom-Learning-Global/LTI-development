export default defineEventHandler((event) => {
    setHeader(event, "Access-Control-Allow-Origin", "*");
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