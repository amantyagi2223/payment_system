// src/auth/jwt.constants.ts

export const jwtConstants = {
  secret: process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION',
};
