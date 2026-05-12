// Temporary site-wide HTTP Basic Auth, used while the site is being shared
// with grant reviewers before public launch. To disable: unset BASIC_AUTH_USER
// and BASIC_AUTH_PASSWORD in Netlify (Site settings → Environment variables)
// and redeploy, or delete this file.

export default async (request, context) => {
  const expectedUser = Deno.env.get("BASIC_AUTH_USER");
  const expectedPass = Deno.env.get("BASIC_AUTH_PASSWORD");

  // Fail open when no credentials are configured, so removing the env vars
  // is a one-step way to make the site public.
  if (!expectedUser || !expectedPass) {
    return context.next();
  }

  const header = request.headers.get("authorization");

  if (header && header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);

      if (user === expectedUser && pass === expectedPass) {
        return context.next();
      }
    } catch {
      // Malformed header — fall through to 401.
    }
  }

  return new Response("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate":
        'Basic realm="Friends of the Hearing Center", charset="UTF-8"',
    },
  });
};

export const config = {
  path: "/*",
};
