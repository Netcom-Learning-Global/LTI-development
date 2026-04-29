import axios from "axios";
import logger from "../utils/logger";

export const getAccessToken = async () => {
  const url = `${process.env.AUTH_URL}/auth/getaccesstoken`;
  try {
    logger.info({
      msg: "Requesting access token",
      url,
    });
    const res = await axios.get(
      url,
      {
        headers: {
          "org-api-key": process.env.ORG_API_KEY!,
          "org-api-token": process.env.ORG_API_TOKEN!,
          "org-id": process.env.ORG_ID!,
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
      response: err.response?.data,
      error: err.message,
    });

    console.error(" AUTH ERROR:", err.response?.data || err.message);
    throw err;
  }
};
