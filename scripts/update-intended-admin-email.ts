import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const valueFor = (name: string) => {
  const prefix = `--${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
};

const schoolId = valueFor("school-id");
const currentEmail = valueFor("current-email");
const newEmail = valueFor("new-email") ?? "amirwattoo831@gmail.com";

if (!schoolId || !currentEmail) throw new Error("Usage: npm run admin:update-email -- --school-id=<exact-id> --current-email=<exact-email> [--new-email=<email>]");

try {
  const candidates = await prisma.systemUser.findMany({
    where: { schoolId, email: { equals: currentEmail, mode: "insensitive" }, role: "PRINCIPAL" },
    select: { id: true, schoolId: true, email: true },
    take: 2,
  });
  if (candidates.length !== 1) throw new Error(`Refused: expected exactly one scoped principal, found ${candidates.length}`);
  const target = candidates[0]!;
  await prisma.$transaction([
    prisma.systemUser.update({ where: { id: target.id }, data: { email: newEmail.toLowerCase() } }),
    prisma.auditLog.create({ data: { schoolId, userId: target.id, action: "ADMIN_EMAIL_UPDATED", entityType: "SystemUser", entityId: target.id, details: { fields: ["email"], source: "scoped-production-script" } } }),
  ]);
  console.info("Updated exactly one scoped principal account.");
} finally { await prisma.$disconnect(); }
