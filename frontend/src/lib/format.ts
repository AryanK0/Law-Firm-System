const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(value: string | null | undefined, fallback = "Not set") {
  const parsed = parseDate(value);
  return parsed ? dateFormatter.format(parsed) : fallback;
}

export function formatDateTime(
  value: string | null | undefined,
  fallback = "Not set",
) {
  const parsed = parseDate(value);
  return parsed ? dateTimeFormatter.format(parsed) : fallback;
}

export function formatCurrency(value: number | null | undefined) {
  return currencyFormatter.format(value ?? 0);
}

export function formatCaseCode(value: string | null | undefined, fallback = "Matter") {
  if (!value) {
    return fallback;
  }

  return value
    .replace(/^PSL-/i, "MAT-")
    .replace(/^Case\s+#/i, "Matter #");
}

export function truncate(value: string | null | undefined, limit = 96) {
  if (!value) {
    return "";
  }

  return value.length > limit ? `${value.slice(0, limit - 1)}...` : value;
}
