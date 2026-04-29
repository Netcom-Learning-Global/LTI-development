import { defineNuxtConfig } from "nuxt/config";
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ["@nuxt/ui"],
  devServer: {
    port: 9000
  },
  typescript: {
    typeCheck: false, // Prevents the heavy background type checking
    strict: false     // Or just disable strict route types if you prefer
  },
  vite: {
    server: {
      allowedHosts: [
        "populous-supersingular-ha.ngrok-free.dev"
      ]
    }
  },
  runtimeConfig: {
    serverUrl: "http://localhost:9000", // ✅ IMPORTANT (don’t leave empty)
    jwtSecret: "mysecret", // ✅ add any string
  },
  // 🔥 ADD THIS BLOCK (MAIN FIX)
  nitro: {
    routeRules: {
      "/**": {
        headers: {
          "X-Frame-Options": "ALLOWALL",
        },
      },
    },
  },
});