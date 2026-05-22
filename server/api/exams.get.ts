import axios from "axios";
import { getAccessToken } from "../api/auth";
import logger from "../utils/logger";
export default defineEventHandler(async (event) => {
   const query = getQuery(event);
   const {
    searchQuery = "",
    page = 1,
    limit = 10,
    sortBy = "created_date",
    sortOrder = "ASC",
  } = query;
    const url = `${process.env.LTI_SSO_EXAM_GENERATE}/sync/getexam/list`;
    try {
      logger.info({
        msg: "Fetching exam list",
        url,
      });
      const accessToken = await getAccessToken();
      //console.log("url", url);
      logger.info({
        msg: "Access token fetched for exam API",
      });
      const res = await axios.get(url,
        {
          headers: {
            "req-access-token": accessToken,
            "org-api-key": process.env.ORG_API_KEY!,
          },
          params: {
            searchQuery,
            page,
            limit,
            sortBy,
            sortOrder,
          },
        }
      );
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
      //console.error(" EXAM API ERROR:", err.response?.data || err.message);
      return [];
    }
  });