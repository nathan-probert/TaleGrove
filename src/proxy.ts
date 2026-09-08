import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_PAGES = [/^\/signin(\/|$)/, /^\/signup(\/|$)/, /^\/forgot-password(\/|$)/, /^\/reset-password(\/|$)/];
const PROTECTED_PAGES = [/^\/books(\/|$)/, /^\/book(\/|$)/, /^\/search(\/|$)/, /^\/discover(\/|$)/];
const PROTECTED_API_PREFIXES = ["/api/recommendations"];

function matches(pathname: string, patterns: RegExp[]) {
  return patterns.some((re) => re.test(pathname));
}

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient(
    { req, res },
    {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY!,
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  if (!session && matches(pathname, PROTECTED_PAGES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  if (!session && PROTECTED_API_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session && matches(pathname, AUTH_PAGES)) {
    const url = req.nextUrl.clone();
    url.pathname = "/books";
    url.searchParams.delete("redirectedFrom");
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
