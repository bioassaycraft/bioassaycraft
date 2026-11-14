export async function loadSupplement(action, body, signal) {
  const response = await fetch(`/api/v1/target-to-assay/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal,
  });
  const statusCode = { 422: "invalid_query", 429: "rate_limited", 504: "timeout" }[response.status];
  let result;
  try {
    result = await response.json();
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error(statusCode || (response.ok ? "parse_error" : "upstream_error"), { cause: error });
  }
  if (!response.ok) throw new Error(result?.error?.code || statusCode || "upstream_error");
  return result;
}
