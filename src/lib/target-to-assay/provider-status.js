export function providerIssue(error) {
  const status = error?.details?.status ?? Number(error?.message?.match(/^upstream_(\d{3})$/)?.[1]);
  if (status === 429) return { state: "rate_limited", status };
  if (status) return { state: "upstream_error", status };
  if (error?.name === "TimeoutError") return { state: "timeout" };
  if (error?.name === "AbortError") return { state: "cancelled" };
  if (error?.name === "SyntaxError" || /^unexpected_/.test(error?.message))
    return { state: "parse_error" };
  if (error?.details?.reason === "graphql_errors")
    return { state: "upstream_error", reason: "graphql_errors" };
  return { state: "unavailable" };
}
