import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.status(200).json({
    status: "ok",
    service: "school-fixture-api",
    timestamp: new Date().toISOString(),
  });
});
