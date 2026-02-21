const CONVEX_HTTP_TIMEOUT_MS = 10000;

type ConvexEndpoint = "query" | "mutation" | "action";

type ConvexSuccess<T> = {
  status: "success";
  value: T;
  logLines?: string[];
};

type ConvexFailure = {
  status: "error";
  errorMessage?: string;
  errorData?: unknown;
  logLines?: string[];
};

type ConvexResponse<T> = ConvexSuccess<T> | ConvexFailure;

function getConvexUrl() {
  const preferred =
    process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";

  if (preferred.includes(".convex.site")) {
    return preferred.replace(".convex.site", ".convex.cloud");
  }

  return preferred;
}

function getConvexHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Optional. Useful if you run Convex functions that require admin auth.
  if (process.env.CONVEX_DEPLOY_KEY) {
    headers.Authorization = `Convex ${process.env.CONVEX_DEPLOY_KEY}`;
  }

  return headers;
}

export async function callConvex<T>(
  endpoint: ConvexEndpoint,
  path: string,
  args: Record<string, unknown>
) {
  const convexUrl = getConvexUrl();

  if (!convexUrl) {
    throw new Error(
      "Missing Convex URL. Set CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL)."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, CONVEX_HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(`${convexUrl}/api/${endpoint}`, {
      method: "POST",
      headers: getConvexHeaders(),
      body: JSON.stringify({ path, args, format: "json" }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Convex HTTP ${response.status}: ${body}`);
    }

    const payload = (await response.json()) as ConvexResponse<T>;

    if (payload.status === "error") {
      throw new Error(payload.errorMessage ?? "Unknown Convex error");
    }

    return payload.value;
  } finally {
    clearTimeout(timeout);
  }
}
