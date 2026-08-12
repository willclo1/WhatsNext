import { request } from "./http";
import type { Actor } from "../types/actor";

export function getActor(actorId: number, signal?: AbortSignal): Promise<Actor> {
    return request<Actor>(`/actors/${actorId}`, { signal });
}
