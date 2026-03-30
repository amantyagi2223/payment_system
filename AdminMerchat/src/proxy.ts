import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Keep middleware side-effect free to avoid accidental session drops on navigation.
  return NextResponse.next();
}

// Legacy config for backward compatibility
export const config = {
  matcher: ["/:path*"],
};

