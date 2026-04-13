const BASE_URL = "/api";

export async function fetchCases() {
  const res = await fetch(`${BASE_URL}/cases`);
  if (!res.ok) throw new Error("Failed to fetch cases");
  return res.json();
}