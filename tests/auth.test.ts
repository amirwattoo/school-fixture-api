import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

import bcrypt from "bcrypt";

import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma/client.js";
import { hashToken, verifyAccessToken } from "../src/modules/auth/token.service.js";

const TEST_SCHOOL_ID = "phase-2-auth-test-school";
const OTHER_SCHOOL_ID = "phase-2-other-school";
const PASSWORD = "Testing123!";

let baseUrl = "";
let closeServer: (() => Promise<void>) | undefined;
let principalId = "";
let timetableId = "";

type ApiResult<T> = {
  response: Response;
  body: {
    success: boolean;
    data?: T;
    error?: { code: string; message: string };
  };
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return {
    response,
    body: (await response.json()) as ApiResult<T>["body"],
  };
};

const login = (email: string, password = PASSWORD) =>
  request<{ accessToken: string; user: { id: string } }>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

const cookieFrom = (response: Response) => {
  const setCookie = response.headers.get("set-cookie");
  assert.ok(setCookie, "Expected a refresh-token cookie");
  return setCookie.split(";")[0]!;
};

before(async () => {
  await prisma.school.deleteMany({
    where: { id: { in: [TEST_SCHOOL_ID, OTHER_SCHOOL_ID] } },
  });

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  await prisma.school.create({
    data: {
      id: TEST_SCHOOL_ID,
      name: "Authentication Test School",
      academicYear: "2026",
      users: {
        create: [
          {
            name: "Test Principal",
            email: "principal.auth-test@example.local",
            passwordHash,
            role: "PRINCIPAL",
            isActive: true,
          },
          {
            name: "Test Timetable Incharge",
            email: "timetable.auth-test@example.local",
            passwordHash,
            role: "TIMETABLE_INCHARGE",
            isActive: true,
          },
          {
            name: "Inactive User",
            email: "inactive.auth-test@example.local",
            passwordHash,
            role: "TIMETABLE_INCHARGE",
            isActive: false,
          },
        ],
      },
    },
  });
  await prisma.school.create({
    data: {
      id: OTHER_SCHOOL_ID,
      name: "Other School",
      academicYear: "2026",
      users: {
        create: {
          name: "Other School Timetable Incharge",
          email: "other-school.auth-test@example.local",
          passwordHash,
          role: "TIMETABLE_INCHARGE",
        },
      },
    },
  });

  const users = await prisma.systemUser.findMany({
    where: { schoolId: TEST_SCHOOL_ID },
  });
  principalId = users.find((user) => user.role === "PRINCIPAL")!.id;
  timetableId = users.find(
    (user) => user.email === "timetable.auth-test@example.local",
  )!.id;

  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;
  closeServer = () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
});

after(async () => {
  await closeServer?.();
  await prisma.school.deleteMany({
    where: { id: { in: [TEST_SCHOOL_ID, OTHER_SCHOOL_ID] } },
  });
  await prisma.$disconnect();
});

test("bcrypt hashes and verifies passwords without storing plaintext", async () => {
  const hash = await bcrypt.hash(PASSWORD, 12);
  assert.notEqual(hash, PASSWORD);
  assert.equal(await bcrypt.compare(PASSWORD, hash), true);
});

test("successful login returns an access token and HTTP-only refresh cookie", async () => {
  const result = await login("principal.auth-test@example.local");
  assert.equal(result.response.status, 200);
  assert.equal(result.body.success, true);
  assert.ok(result.body.data?.accessToken);
  assert.match(result.response.headers.get("set-cookie") ?? "", /HttpOnly/i);
});

test("invalid password uses a generic credentials error", async () => {
  const result = await login(
    "principal.auth-test@example.local",
    "Incorrect123!",
  );
  assert.equal(result.response.status, 401);
  assert.equal(result.body.error?.code, "INVALID_CREDENTIALS");
  assert.equal(result.body.error?.message, "Email or password is incorrect");
});

test("inactive users cannot log in", async () => {
  const result = await login("inactive.auth-test@example.local");
  assert.equal(result.response.status, 401);
  assert.equal(result.body.error?.code, "INVALID_CREDENTIALS");
});

test("access token verifies and contains the minimal authorization claims", async () => {
  const result = await login("principal.auth-test@example.local");
  const payload = verifyAccessToken(result.body.data!.accessToken);
  assert.deepEqual(payload, {
    sub: principalId,
    schoolId: TEST_SCHOOL_ID,
    role: "PRINCIPAL",
  });
});

test("/auth/me rejects anonymous access and returns the authenticated user", async () => {
  const anonymous = await request("/api/v1/auth/me");
  assert.equal(anonymous.response.status, 401);

  const session = await login("principal.auth-test@example.local");
  const authenticated = await request<{ user: { id: string } }>(
    "/api/v1/auth/me",
    {
      headers: {
        Authorization: `Bearer ${session.body.data!.accessToken}`,
      },
    },
  );
  assert.equal(authenticated.response.status, 200);
  assert.equal(authenticated.body.data?.user.id, principalId);
});

test("refresh rotates tokens and rejects the replaced token", async () => {
  const session = await login("principal.auth-test@example.local");
  const originalCookie = cookieFrom(session.response);
  const refreshed = await request<{ accessToken: string }>(
    "/api/v1/auth/refresh",
    {
      method: "POST",
      headers: { Cookie: originalCookie },
    },
  );
  assert.equal(refreshed.response.status, 200);
  assert.ok(refreshed.body.data?.accessToken);
  assert.notEqual(cookieFrom(refreshed.response), originalCookie);

  const replay = await request("/api/v1/auth/refresh", {
    method: "POST",
    headers: { Cookie: originalCookie },
  });
  assert.equal(replay.response.status, 401);
  assert.equal(replay.body.error?.code, "INVALID_REFRESH_TOKEN");
});

test("logout revokes the presented refresh token", async () => {
  const session = await login("principal.auth-test@example.local");
  const cookie = cookieFrom(session.response);
  const logoutResult = await request("/api/v1/auth/logout", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(logoutResult.response.status, 200);

  const refreshResult = await request("/api/v1/auth/refresh", {
    method: "POST",
    headers: { Cookie: cookie },
  });
  assert.equal(refreshResult.response.status, 401);
});

test("forgot password uses the same generic response for known and unknown email", async () => {
  for (const email of ["principal.auth-test@example.local", "unknown.auth-test@example.local"]) {
    const result = await request<Record<string, never>>("/api/v1/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.success, true);
  }
});

test("a valid password reset is one-time and revokes existing refresh sessions", async () => {
  const session = await login("principal.auth-test@example.local");
  const cookie = cookieFrom(session.response);
  const rawToken = "valid-password-reset-token-with-enough-entropy-123456789";
  await prisma.passwordResetToken.create({ data: { userId: principalId, schoolId: TEST_SCHOOL_ID, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 60_000) } });
  const reset = await request("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ token: rawToken, newPassword: "NewTesting123!" }) });
  assert.equal(reset.response.status, 200);
  const reuse = await request("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ token: rawToken, newPassword: "AnotherTesting123!" }) });
  assert.equal(reuse.response.status, 400);
  assert.equal(reuse.body.error?.code, "INVALID_RESET_TOKEN");
  const refresh = await request("/api/v1/auth/refresh", { method: "POST", headers: { Cookie: cookie } });
  assert.equal(refresh.response.status, 401);
  const relogin = await login("principal.auth-test@example.local", "NewTesting123!");
  assert.equal(relogin.response.status, 200);
  await prisma.systemUser.update({ where: { id: principalId }, data: { passwordHash: await bcrypt.hash(PASSWORD, 12) } });
});

test("expired password reset tokens are rejected", async () => {
  const rawToken = "expired-password-reset-token-with-enough-entropy-123456";
  await prisma.passwordResetToken.create({ data: { userId: principalId, schoolId: TEST_SCHOOL_ID, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() - 1_000) } });
  const result = await request("/api/v1/auth/reset-password", { method: "POST", body: JSON.stringify({ token: rawToken, newPassword: "ExpiredTesting123!" }) });
  assert.equal(result.response.status, 400);
  assert.equal(result.body.error?.code, "INVALID_RESET_TOKEN");
});

test("forgot password requests are rate limited without changing the generic success body", async () => {
  let status = 0;
  for (let index = 0; index < 6; index += 1) {
    const result = await request("/api/v1/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: "rate-limit.auth-test@example.local" }) });
    status = result.response.status;
  }
  assert.equal(status, 429);
});

test("Principal can create a Timetable Incharge without exposing passwordHash", async () => {
  const session = await login("principal.auth-test@example.local");
  const created = await request<{
    user: { email: string; passwordHash?: string };
  }>("/api/v1/users", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.body.data!.accessToken}`,
    },
    body: JSON.stringify({
      name: "Created Incharge",
      email: "created.auth-test@example.local",
      temporaryPassword: "Temporary123!",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(
    created.body.data?.user.email,
    "created.auth-test@example.local",
  );
  assert.equal(created.body.data?.user.passwordHash, undefined);
});

test("Timetable Incharge is denied Principal-only user routes", async () => {
  const session = await login("timetable.auth-test@example.local");
  const result = await request("/api/v1/users", {
    headers: {
      Authorization: `Bearer ${session.body.data!.accessToken}`,
    },
  });
  assert.equal(result.response.status, 403);
  assert.equal(result.body.error?.code, "FORBIDDEN");
});

test("user listing is isolated to the Principal's school", async () => {
  const session = await login("principal.auth-test@example.local");
  const result = await request<{
    users: Array<{ id: string; schoolId: string }>;
  }>("/api/v1/users", {
    headers: {
      Authorization: `Bearer ${session.body.data!.accessToken}`,
    },
  });
  assert.equal(result.response.status, 200);
  assert.ok(result.body.data?.users.some((user) => user.id === timetableId));
  assert.ok(
    result.body.data?.users.every((user) => user.schoolId === TEST_SCHOOL_ID),
  );
});
