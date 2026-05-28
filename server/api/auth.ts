import axios from "axios";
import logger from "../utils/logger";
import Platform from "../models/Platform";
import { connectDB } from "../utils/db";
import crypto from "crypto";

const generateChecksum = (
  orgId: number,
  apiKey: string,
  secretKey: string
) => {

  const data =
    `${orgId}:${apiKey}:${secretKey}`;

  return crypto
    .createHash("sha256")
    .update(data)
    .digest("hex");
};

export const getAccessToken = async (orgId: number) => {
  const url = `${process.env.AUTH_URL}/auth/getaccesstoken`;
  try {
    logger.info({
      msg: "Requesting access token",
      url,
    });
    await connectDB();
    const platform = await Platform.findOne({
      orgId: Number(orgId),
    });
     logger.info({
      msg: "Requesting access token",
      url,
      orgId,
    });
    const checksum =
      generateChecksum(
        Number(platform!.orgId),
        String(platform!.apiKey),
        String(platform!.secretKey)
      );
    const res = await axios.get(
      url,
      {
        headers: {
          "org-api-key": String(platform!.apiKey),
          "org-api-token": checksum,
          "org-id": String(platform!.orgId),
        }
      }
    );
    const token = res?.data?.data?.access_token;
    if (!token){
      logger.error({
        msg: "Access token missing in response",
        response: res.data,
      });
      throw new Error("Access token missing");
    }
    logger.info({
      msg: "Access token received successfully",
    }); 
    return token;
  } catch (err: any) {
    logger.error({
      msg: "AUTH API ERROR",
      url,
      status: err.response?.status,
      error: err.message,
    });
    console.error(" AUTH ERROR:", err.response?.data || err.message);
    throw err;
  }
};
