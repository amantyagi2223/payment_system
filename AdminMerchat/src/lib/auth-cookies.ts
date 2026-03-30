export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export const AUTH_COOKIE_BASE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: AUTH_COOKIE_MAX_AGE,
};

