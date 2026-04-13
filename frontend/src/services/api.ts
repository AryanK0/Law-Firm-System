const BASE_URL = "/api";

async function request(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res.json();
}

export function fetchCases() {
  return request("/cases");
}

export function fetchClients() {
  return request("/clients");
}

export function fetchTickets() {
  return request("/tickets");
}

export function fetchOverview() {
  return request("/overview");
}