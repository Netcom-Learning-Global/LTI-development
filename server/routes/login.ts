import { randomBytes } from "node:crypto";
import { getStateCookieName } from "../utils/cookie";
import { connectDB } from "../utils/db";
import Platform from "../models/Platform";

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
  console.log("LOOKUP KEY:", `${params.iss}:${params.client_id}`);

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

  // ✅ STATE COOKIE
  const state = encodeURIComponent(randomBytes(25).toString("hex"));
  const cookieName = getStateCookieName(state);

  setCookie(event, cookieName, params.iss, {
    httpOnly: true,
    maxAge: 60 * 1000,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  // ✅ NONCE
  const nonce = encodeURIComponent(
    [...Array(25)].map(() => ((Math.random() * 36) | 0).toString(36)).join("")
  );

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