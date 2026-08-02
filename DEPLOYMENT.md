# Proxy Management API deployment

Apply checked-in Prisma migrations with `npx prisma migrate deploy` before restarting the API. Configure `FRONTEND_URL` and either `EMAIL_PROVIDER=mock` for non-production testing or `EMAIL_PROVIDER=smtp` with `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD`. PDF timetable previews also require `PDFTOTEXT_PATH`; CSV import has no system dependency.

To update only the intended existing production principal, first identify the exact school ID and current principal email, then run:

`npm run admin:update-email -- --school-id=<exact-school-id> --current-email=<exact-current-email>`

The script refuses zero or multiple matches and records an audit entry. It never updates administrators at other schools.
