export async function loadSupplement(action, body, signal) {
  const response = await fetch(`/api/v1/target-to-assay/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.code || "upstream_error");
  return result;
}
