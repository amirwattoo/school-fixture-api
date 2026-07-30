import type { UserRole } from "@prisma/client";
export declare const REFRESH_COOKIE_NAME = "school_fixture_refresh";
export type AuthTokenPayload = {
    sub: string;
    schoolId: string;
    role: UserRole;
};
export declare const refreshLifetimeSeconds: number;
export declare const hashToken: (token: string) => string;
export declare const signAccessToken: (payload: AuthTokenPayload) => string;
export declare const signRefreshToken: (payload: AuthTokenPayload) => string;
export declare const verifyAccessToken: (token: string) => AuthTokenPayload;
export declare const verifyRefreshToken: (token: string) => AuthTokenPayload;
export declare const refreshCookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax";
    path: string;
    maxAge: number;
};
//# sourceMappingURL=token.service.d.ts.map