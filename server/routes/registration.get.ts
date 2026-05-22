import { ZodError, z } from "zod";
import { generatePlatformKeyPair } from "../utils/auth";
import { connectDB } from "../utils/db";
import Platform from "../models/Platform";
import logger from "../utils/logger";

type Configuration = {
  issuer: string;
  token_endpoint: string;
  jwks_uri: string;
  authorization_endpoint: string;
  registration_endpoint: string;
  claims_supported: string[];
  "https://purl.imsglobal.org/spec/lti-platform-configuration": {
    product_family_code: string;
  };
};

const registrationQuerySchema = z.object({
  openid_configuration: z.string(),
  registration_token: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const { serverUrl } = useRuntimeConfig();

  let configurationEndpoint, registrationToken;

  try {
    ({
      openid_configuration: configurationEndpoint,
      registration_token: registrationToken,
    } = await registrationQuerySchema.parseAsync(query));
  } catch (error: any) {
    logger.error("Error parsing query", { error });

    if (error instanceof ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: error.message,
      });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Something went wrong",
    });
  }

const configRes = await fetch(configurationEndpoint);
//console.log("👉 CONFIG STATUS:", configRes.status);

const configuration: Configuration = await configRes.json();
await connectDB();

const existingPlatform = await Platform.findOne({
  moodleUrl: configuration.issuer,
});

if (!existingPlatform) {
  throw createError({
    statusCode: 404,
    statusMessage: "Platform onboarding data not found",
  });
}
//console.log("👉 CONFIG DATA:", configuration);
 // const configuration: Configuration = await fetch(configurationEndpoint).then(res => res.json());

  const scope = [
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
    "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
    "https://purl.imsglobal.org/spec/lti-ags/scope/score",
    "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
    "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
  ];

  const launchUrl = new URL("launch", serverUrl);
  const deepLinkUrl = new URL("deep-link-launch", serverUrl);
  const loginUrl = new URL("login", serverUrl);
  const keysUrl = new URL("keys", serverUrl);

  const registrationRequest = {
    application_type: "web",
    grant_types: ["implicit", "client_credentials"],
    response_types: ["id_token"],
    redirect_uris: [launchUrl.href, deepLinkUrl.href],
    initiate_login_uri: loginUrl.href,
    client_name: existingPlatform.toolName,
    jwks_uri: keysUrl.href,
    logo_uri: "https://moodle.org/theme/image.php/boost/lti/1776507478/monologo",
    token_endpoint_auth_method: "private_key_jwt",
    scope: scope.join(" "),
    "https://purl.imsglobal.org/spec/lti-tool-configuration": {
      domain: serverUrl,
      description: existingPlatform.description,
      target_link_uri: launchUrl.href,
      custom_parameters: {},
      claims: configuration.claims_supported,
      messages: [
        {
          type: "LtiResourceLinkRequest",
          target_link_uri: launchUrl.href,
          launch_presentation: {
            document_target: "window"
          }
        },
        {
          type: "LtiDeepLinkingRequest",
          target_link_uri: deepLinkUrl.href,
          launch_presentation: {
            document_target: "window"
          }
        },
      ],
    },
  };

  // ✅ Register tool with LMS
  //console.log("👉 REG ENDPOINT:", configuration.registration_endpoint);

const regRes = await fetch(configuration.registration_endpoint, {
  method: "POST",
  body: JSON.stringify(registrationRequest),
  headers: {
    Authorization: `Bearer ${registrationToken}`,
    "Content-Type": "application/json",
  },
});

logger.info("LTI registration response received", {
  status: regRes.status,
});

const regData = await regRes.json();
const clientId = regData.client_id;
  const platformName =
    configuration["https://purl.imsglobal.org/spec/lti-platform-configuration"]
      .product_family_code;

  const { kid, privateKey, publicKey } = await generatePlatformKeyPair();

  const platform = {
    url: configuration.issuer,
    name: platformName,
    clientId,
    authenticationEndpoint: configuration.authorization_endpoint,
    accessTokenEndpoint: configuration.token_endpoint, 
    authConfig: {
      method: "JWK_SET",
      key: configuration.jwks_uri,
    },
    kid,
    privateKey, 
    publicKey,
  };

  logger.info("Registering platform", { platform });

  logger.info("Saving platform to DB", {
    iss: platform.url,
    clientId: platform.clientId,
  });
  await Platform.findOneAndUpdate(
    {
      moodleUrl: configuration.issuer,
    },
    {
      iss: platform.url,
      clientId: platform.clientId,
      data: platform,
    },
    {
      upsert: true,
      new: true,
    }
  );

  appendResponseHeaders(event, {
    "content-type": "text/html",
  });

  return `<script>
    console.log("Registration success");
    (window.opener || window.parent).postMessage(
      {subject:"org.imsglobal.lti.close"},
      "*"
    );
  </script>`;
});