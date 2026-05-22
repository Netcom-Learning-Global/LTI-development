import { defineNuxtConfig } from "nuxt/config";

export default defineNuxtConfig({
  devtools: { enabled: true },

  modules: ["@nuxt/ui"],

  devServer: {
    port: 9000
  },

  typescript: {
    typeCheck: false,
    strict: false
  },
  vite: {
    server: {
      allowedHosts: [
        "populous-supersingular-ha.ngrok-free.dev"
      ]
    }
  },
  runtimeConfig: {
    serverUrl: "http://localhost:9000",
    jwtSecret: "mysecret",
  },
  routeRules: {
    "/**": {
      headers: {
        "X-Frame-Options": "ALLOWALL"
      }
    }
  }
});