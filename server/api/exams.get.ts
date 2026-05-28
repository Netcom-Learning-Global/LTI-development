import axios from "axios";
import { getQuery } from "h3";
import { getAccessToken } from "../api/auth";
import logger from "../utils/logger";
import Platform from "../models/Platform";
import { connectDB } from "../utils/db";
export default defineEventHandler(async (event) => {
   const query = getQuery(event);
   const {
    searchQuery = "",
    page = 1,
    limit = 30,
    sortBy = "created_date",
    sortOrder = "ASC",
    moodleUrl,
  } = query;
    const url = `${process.env.LTI_SSO_EXAM_GENERATE}/sync/getexam/list`;
    try {
    await connectDB();
    const platform = await Platform.findOne({
     moodleUrl: String(moodleUrl),
    });
    if (!platform) {
      throw new Error("Platform not found");
    }
      const accessToken = await getAccessToken(Number(platform.orgId));
      logger.info({
        msg: "Access token fetched for exam API",
        orgId: platform.orgId,
        accessToken: accessToken ? "YES" : "NO",
      });
      const res = await axios.get(url, {
      headers: {
        "req-access-token": accessToken,
        "org-api-key": String(platform.apiKey),
      },

      params: {
        searchQuery,
        page,
        limit,
        sortBy,
        sortOrder,
      },
    });
      const exams = res?.data?.data?.data || [];
      logger.info({
        msg: "Exam list fetched successfully",
        count: exams.length,
      });
      return exams.map((e: any) => ({
        id: e.id,
        name: e.title,
      }));
    } catch (err: any) {
      logger.error({
        msg: "EXAM API ERROR",
        url,
        status: err.response?.status,
        response: err.response?.data,
        error: err.message,
      });
      return [];
    }
  });