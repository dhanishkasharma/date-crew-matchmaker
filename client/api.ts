export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json().catch(() => ({
    error: "The server could not be reached. Please try again.",
  }));
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("tdc-session-expired"));
    throw new ApiError(response.status, body.error || "Something went wrong.");
  }
  return body as T;
}
export const post = <T>(path: string, value: unknown) =>
  api<T>(path, { method: "POST", body: JSON.stringify(value) });
export const patch = <T>(path: string, value: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(value) });
