import { NextResponse } from "next/server";

function clearSessionCookies(response: NextResponse) {
  response.cookies.set("auth_role", "", {
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("auth_email", "", {
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("auth_token", "", {
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("auth_merchant_id", "", {
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("auth_merchant_api_key", "", {
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("auth_merchant_token", "", {
    path: "/",
    maxAge: 0,
  });
}

export function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url), 303);
  clearSessionCookies(response);
  return response;
}

export function GET() {
  return NextResponse.json({ message: "Method Not Allowed" }, { status: 405 });
}
