// 서버사이드용 fetch 헬퍼
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:18080";

export async function adminFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const c = await cookies();
  const token = c.get("admin_token")?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": token ?? "",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API ${res.status}`);
  }
  return res.json();
}

export function getApiUrl() {
  return API_URL;
}
