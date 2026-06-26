import { jwtVerify, createRemoteJWKSet } from "jose";
const baseUrl = process.env.PUBLIC_CLIENT_URL || "http://localhost:3000";
const JWKS = createRemoteJWKSet(new URL(baseUrl + "/api/auth/jwks"));
async function validateToken(token) {
  
  try {
    const { payload } = await jwtVerify(token, JWKS);

    return payload;
  } catch (error) {
    console.error("Token validation failed:", error);
    throw error;
  }
}

export default validateToken;
