// LinkedIn OAuth Backend Server
// Run this locally for development

const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  cors({
    origin: ["chrome-extension://*", "http://localhost:*"],
    credentials: true,
  })
);
app.use(express.json());

// LinkedIn App Configuration
const LINKEDIN_CONFIG = {
  clientId: process.env.LINKEDIN_CLIENT_ID || "77hcnh58oyowdg",
  clientSecret:
    process.env.LINKEDIN_CLIENT_SECRET || "WPL_AP1.5awqZm8B0x7TFcdH.JQVJlg==",
};

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    server: "LinkedIn OAuth Server",
    version: "1.0.0",
  });
});

// Token exchange endpoint
app.post("/api/linkedin/token", async (req, res) => {
  try {
    const { code, redirectUri } = req.body;

    console.log("Token exchange request received:", {
      code: code ? "present" : "missing",
      redirectUri: redirectUri ? redirectUri : "not provided",
    });

    if (!code) {
      return res.status(400).json({
        error: "Authorization code is required",
        details: "No authorization code provided in request body",
      });
    }

    // Prepare token exchange request
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      redirect_uri: redirectUri,
      client_id: LINKEDIN_CONFIG.clientId,
      client_secret: LINKEDIN_CONFIG.clientSecret,
    });

    console.log("Exchanging code for token with LinkedIn...");

    // Exchange code for access token
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      tokenParams,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        timeout: 10000, // 10 second timeout
      }
    );

    console.log("Token exchange successful");

    // Return token data to extension
    res.json({
      access_token: tokenResponse.data.access_token,
      expires_in: tokenResponse.data.expires_in,
      token_type: tokenResponse.data.token_type,
      scope: tokenResponse.data.scope,
    });
  } catch (error) {
    console.error("Token exchange error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      config: {
        url: error.config?.url,
        method: error.config?.method,
      },
    });

    // Handle different error types
    if (error.response) {
      // LinkedIn API returned an error
      res.status(error.response.status).json({
        error: "LinkedIn API error",
        details: error.response.data,
        status: error.response.status,
      });
    } else if (error.request) {
      // Network error
      res.status(500).json({
        error: "Network error",
        details: "Unable to reach LinkedIn API",
      });
    } else {
      // Other error
      res.status(500).json({
        error: "Token exchange failed",
        details: error.message,
      });
    }
  }
});

// Test endpoint to verify LinkedIn profile access
app.post("/api/linkedin/profile", async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        error: "Access token is required",
      });
    }

    // Fetch profile using OpenID Connect userinfo endpoint
    const profileResponse = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );

    res.json({
      profile: profileResponse.data,
      success: true,
    });
  } catch (error) {
    console.error(
      "Profile fetch error:",
      error.response?.data || error.message
    );

    res.status(error.response?.status || 500).json({
      error: "Profile fetch failed",
      details: error.response?.data || error.message,
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    details: error.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 LinkedIn OAuth Server is running!
📍 Port: ${PORT}
🔗 Health check: http://localhost:${PORT}/api/health
🔑 Token exchange: http://localhost:${PORT}/api/linkedin/token
👤 Profile test: http://localhost:${PORT}/api/linkedin/profile

Environment:
- Client ID: ${LINKEDIN_CONFIG.clientId}
- Client Secret: ${LINKEDIN_CONFIG.clientSecret ? "✅ Set" : "❌ Not set"}

Make sure to update your Chrome extension to use:
http://localhost:${PORT}/api/linkedin/token
  `);
});

module.exports = app;
