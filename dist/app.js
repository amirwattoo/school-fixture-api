import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { attendanceRouter } from "./modules/attendance/attendance.routes.js";
import { classSectionsRouter } from "./modules/class-sections/class-sections.routes.js";
import { fixtureRecordsRouter } from "./modules/fixture-records/fixture-records.routes.js";
import { fixturesRouter } from "./modules/fixtures/fixtures.routes.js";
import { subjectsRouter } from "./modules/subjects/subjects.routes.js";
import { teachersRouter } from "./modules/teachers/teachers.routes.js";
import { timetableRouter } from "./modules/timetable/timetable.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { whatsappRouter } from "./modules/whatsapp/whatsapp.routes.js";
import { healthRouter } from "./routes/health.routes.js";
export const createApp = () => {
    const app = express();
    app.disable("x-powered-by");
    app.use(helmet());
    app.use(cors({
        origin: env.CORS_ORIGIN,
        credentials: true,
    }));
    app.use(express.json({ limit: "1mb" }));
    app.use(cookieParser());
    app.use("/api/v1/health", healthRouter);
    app.use("/api/v1/auth", authRouter);
    app.use("/api/v1/users", usersRouter);
    app.use("/api/v1/teachers", teachersRouter);
    app.use("/api/v1/subjects", subjectsRouter);
    app.use("/api/v1/class-sections", classSectionsRouter);
    app.use("/api/v1/timetable", timetableRouter);
    app.use("/api/v1/attendance", attendanceRouter);
    app.use("/api/v1/fixtures", fixturesRouter);
    app.use("/api/v1/records", fixtureRecordsRouter);
    app.use("/api/v1/whatsapp-notifications", whatsappRouter);
    app.use((_request, response) => {
        response.status(404).json({
            success: false,
            error: {
                code: "NOT_FOUND",
                message: "The requested resource was not found",
            },
        });
    });
    app.use(errorHandler);
    return app;
};
//# sourceMappingURL=app.js.map