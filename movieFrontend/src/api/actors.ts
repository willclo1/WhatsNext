import { API_URL } from "../config";
import type { Actor } from "../types/actor";

async function getErrorMessage(response: Response): Promise<string> {
    try {
        const body = await response.json();

        if (typeof body?.detail === "string") {
            return body.detail;
        }
    } catch {
        // Ignore JSON parsing errors.
    }

    return `Request failed with status ${response.status}`;
}

export async function searchActors(
    query: string,
    signal?: AbortSignal,
): Promise<Actor[]> {
    const url = new URL("/actors/search", API_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "8");

    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}

export async function getActor(
    actorId: number,
    signal?: AbortSignal,
): Promise<Actor> {
    const url = new URL(`/actors/${actorId}`, API_URL);

    const response = await fetch(url, { signal });

    if (!response.ok) {
        throw new Error(await getErrorMessage(response));
    }

    return response.json();
}
