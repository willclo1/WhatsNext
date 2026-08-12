import { API_URL } from "../config";

/**
 * A failed request, carrying enough context for the caller to write copy that
 * suits the situation. `status` is 0 when the request never reached the server.
 */
export class ApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ApiError";
        this.status = status;
    }

    /** True when the server was unreachable, rather than refusing the call. */
    get isOffline(): boolean {
        return this.status === 0;
    }
}

/**
 * Turns a failed response into a message worth showing someone. FastAPI's
 * `detail` is written for developers ("Not Found"), so it's only used when it
 * looks like a real sentence — otherwise the status decides the wording.
 */
async function readError(response: Response): Promise<string> {
    let detail: unknown;

    try {
        detail = (await response.json())?.detail;
    } catch {
        // Body wasn't JSON. The status-based message below covers it.
    }

    if (typeof detail === "string" && detail.includes(" ") && detail.length > 16) {
        return detail;
    }

    if (response.status >= 500) {
        return "The server ran into a problem. Try again in a moment.";
    }

    if (response.status === 404) {
        return "That isn't on the server any more.";
    }

    return `The server refused the request (${response.status}).`;
}

export interface RequestOptions {
    signal?: AbortSignal;
    method?: "GET" | "POST";
    body?: unknown;
    query?: Record<string, string | number>;
}

/** Single entry point for every call to the game API. */
export async function request<T>(
    path: string,
    { signal, method = "GET", body, query }: RequestOptions = {},
): Promise<T> {
    // Concatenate rather than `new URL(path, API_URL)`: resolving a root-
    // relative path against a base discards the base's own path, so an
    // API_URL of "https://host/api" would silently become "https://host".
    // That matters when the API is reverse-proxied under a prefix.
    const url = new URL(
        `${API_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`,
    );

    for (const [key, value] of Object.entries(query ?? {})) {
        url.searchParams.set(key, String(value));
    }

    let response: Response;

    try {
        response = await fetch(url, {
            method,
            signal,
            headers: body ? { "Content-Type": "application/json" } : undefined,
            body: body ? JSON.stringify(body) : undefined,
        });
    } catch (error) {
        // An aborted request is a cancellation, not a failure — let the
        // caller's abort check handle it rather than reporting it.
        if (signal?.aborted) {
            throw error;
        }

        throw new ApiError(
            "Can't reach the server. Check that it's running, then try again.",
            0,
        );
    }

    if (!response.ok) {
        throw new ApiError(await readError(response), response.status);
    }

    return response.json() as Promise<T>;
}
