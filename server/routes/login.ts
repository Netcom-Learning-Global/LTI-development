import { randomBytes } from "node:crypto";
import { getStateCookieName } from "../utils/cookie";
import { connectDB } from "../utils/db";
import Platform from "../models/Platform";
import { setState } from "../storage/state";

type LoginParams = {
  iss: string;
  target_link_uri: string;
  login_hint: string;
  lti_message_hint: string;
  client_id: string;
  lti_deployment_id: string;
};

export default defineEventHandler(async (event) => {
  const params: LoginParams = isMethod(event, "GET")
    ? (getQuery(event) as any)
    : await readBody(event);

  console.log("LOGIN PARAMS:", params);

  // ✅ CONNECT DB
  await connectDB();

  // ✅ FETCH FROM MONGODB
  const record = await Platform.findOne({
    iss: params.iss,
    clientId: params.client_id,
  });

  const platform = record?.data;

  console.log("PLATFORM FROM DB:", platform);

  if (!platform) {
    throw createError({
      statusCode: 404,
      statusMessage: "Platform not found.",
    });
  }
  // ✅ STATE (generate)
  const state = randomBytes(25).toString("hex");

  // ✅ STORE STATE IN SERVER (CRITICAL FIX)
  await setState(state, {
    issuer: params.iss,
    clientId: params.client_id,
    createdAt: Date.now(),
  });
  const cookieName = getStateCookieName(state);

  setCookie(event, cookieName, params.iss, {
    httpOnly: true,
    maxAge: 60 * 1000,
    secure: false,
    sameSite: "lax",
    path: "/",
  });

  // ✅ NONCE
  const nonce = randomBytes(25).toString("hex");

  const authRequestQuery = {
    response_type: "id_token",
    response_mode: "form_post",
    id_token_signed_response_alg: "RS256",
    scope: "openid",
    client_id: params.client_id,
    redirect_uri: params.target_link_uri,
    login_hint: params.login_hint,
    nonce,
    prompt: "none",
    state,
    lti_message_hint: params.lti_message_hint,
    lti_deployment_id: params.lti_deployment_id,
  };

  const url = new URL(platform.authenticationEndpoint);
  url.search = new URLSearchParams(authRequestQuery).toString();

  return sendRedirect(event, url.href);
});