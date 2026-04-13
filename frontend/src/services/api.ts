const BASE_URL = "/api";

async function request(path: string) {
  const res = await fetch(`${BASE_URL}${path}`);

  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`);
  }

  return res.json();
}

export const fetchCases = () => request("/cases");
export const fetchClients = () => request("/clients");
export const fetchTickets = () => request("/tickets");
export const fetchDocuments = () => request("/documents");
export const fetchOverview = () => request("/overview");