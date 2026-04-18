/**
 * Typed API client for the Aristotle backend.
 *
 * All calls hit NEXT_PUBLIC_API_BASE_URL. In dev this is
 * http://localhost:8000/api/v1; in prod it is set via Vercel env vars.
 */

import type {
  AnswerRequest,
  AnswerResponse,
  AvatarConfig,
  Battle,
  BattleSummary,
  Course,
  LevelDetailResponse,
  ProgressResponse,
  SkillsGraph,
  StartBattleResponse,
  Theme,
  User,
  VisualizeResponse,
  WorldResponse,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, `${res.status} ${res.statusText}: ${text}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Auth (mocked) ----------

export const api = {
  auth: {
    me: () => request<User>("/auth/me"),
  },

  courses: {
    list: () => request<Course[]>("/courses"),
    get: (id: string) => request<{ course: Course; lectures: unknown[]; levels: unknown[] }>(`/courses/${id}`),
    setTheme: (id: string, theme: Theme) =>
      request<Course>(`/courses/${id}/theme`, { method: "PATCH", json: { theme } }),
  },

  world: {
    get: (courseId: string) =>
      request<WorldResponse>(`/courses/${courseId}/world`),
    level: (levelId: string) =>
      request<LevelDetailResponse>(`/levels/${levelId}`),
  },

  battles: {
    start: (levelId: string) =>
      request<StartBattleResponse>("/battles/start", {
        method: "POST",
        json: { level_id: levelId },
      }),
    answer: (battleId: string, body: AnswerRequest) =>
      request<AnswerResponse>(`/battles/${battleId}/answer`, {
        method: "POST",
        json: body,
      }),
    abandon: (battleId: string) =>
      request<Battle>(`/battles/${battleId}/abandon`, { method: "POST" }),
    summary: (battleId: string) =>
      request<BattleSummary>(`/battles/${battleId}/summary`),
  },

  skills: {
    graph: (courseId: string) =>
      request<SkillsGraph>(`/courses/${courseId}/skills`),
    visualize: (skillId: string) =>
      request<VisualizeResponse>(`/skills/${skillId}/visualize`, {
        method: "POST",
        json: {},
      }),
  },

  progress: {
    get: () => request<ProgressResponse>("/progress"),
    equip: (slot: string, itemId: string) =>
      request<{ avatar: AvatarConfig; points_remaining: number }>(
        "/avatar/equip",
        { method: "POST", json: { slot, item_id: itemId } },
      ),
    purchase: (itemId: string) =>
      request<{ avatar: AvatarConfig; points_remaining: number }>(
        "/avatar/purchase",
        { method: "POST", json: { item_id: itemId } },
      ),
  },
};

export { ApiError };
