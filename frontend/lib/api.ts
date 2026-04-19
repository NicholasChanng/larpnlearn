/**
 * Typed API client for the Aristotle backend.
 *
 * All calls hit NEXT_PUBLIC_API_BASE_URL. In dev this is
 * http://localhost:8000/api/v1; in prod it is set via Vercel env vars.
 */

import type {
  AvatarConfig,
  CompleteBattleRequest,
  CompleteBattleResponse,
  Course,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  LevelDetailResponse,
  ProgressResponse,
  SkillInsightRequest,
  SkillInsightResponse,
  SkillsGraph,
  SkillsGraphRequest,
  SkillsGraphResponse,
  Theme,
  User,
  ValidateAnswerRequest,
  ValidateAnswerResponse,
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
    generateQuestions: (body: GenerateQuestionsRequest) =>
      request<GenerateQuestionsResponse>("/battles/generate-questions", {
        method: "POST",
        json: body,
      }),
    validateAnswer: (body: ValidateAnswerRequest) =>
      request<ValidateAnswerResponse>("/battles/validate-answer", {
        method: "POST",
        json: body,
      }),
    complete: (body: CompleteBattleRequest) =>
      request<CompleteBattleResponse>("/battles/complete", {
        method: "POST",
        json: body,
      }),
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

  skillGraph: {
    build: (body: SkillsGraphRequest) =>
      request<SkillsGraphResponse>("/skill-graph/graph", {
        method: "POST",
        json: body,
      }),
    insight: (skillId: string, body: SkillInsightRequest) =>
      request<SkillInsightResponse>(
        `/skill-graph/${encodeURIComponent(skillId)}/insight`,
        { method: "POST", json: body },
      ),
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
