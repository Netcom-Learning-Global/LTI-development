const SENSITIVE_KEYS = [
    "password",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "cookie",
    "privatekey",
    "publickey",
    "secret",
    "id_token"
  ];
  
  export function maskSensitive(data: any): any {
    if (!data || typeof data !== "object") return data;
  
    if (Array.isArray(data)) {
      return data.map(maskSensitive);
    }
  
    const masked: any = {};
  
    for (const key in data) {
      const lowerKey = key.toLowerCase();
  
      if (SENSITIVE_KEYS.includes(lowerKey)) {
        masked[key] = "***MASKED***";
      } else if (typeof data[key] === "object") {
        masked[key] = maskSensitive(data[key]);
      } else {
        masked[key] = data[key];
      }
    }
  
    return masked;
  }