/**
 * Shared TypeScript types — mirror of backend/app/models.py.
 *
 * KEEP IN SYNC. Any change here requires a matching change in models.py
 * and mock_data.py. PRs touching these types should be reviewed by the
 * owners of both backend-game and backend-ai tracks.
 */

// ---------- Enums ----------

export type Theme = "mario" | "pokemon" | "greek";

export type LevelState = "locked" | "available" | "completed";

export type QuestionType =
  | "mcq"
  | "spoken"
  | "pseudocode"
  | "math"
  | "short_answer";

export type Difficulty = "easy" | "medium" | "hard";

export type SkillState = "locked" | "attempted" | "mastered";

export type BattleOutcome = "win" | "lose" | "abandoned";

export type ExamType = "midterm" | "final";

export type DocType =
  | "course_overview"
  | "syllabus_section"
  | "schedule_entry"
  | "lecture_overview"
  | "lecture_slide_chunk"
  | "concept_definition"
  | "concept_relationship"
  | "exam_description"
  | "worked_example";

// ---------- Avatar ----------

export interface AvatarConfig {
  base_character: string;
  unlocked_items: string[];
  equipped_items: Record<string, string>;
}

// ---------- User ----------

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_config: AvatarConfig;
  total_points: number;
  current_streak: number;
  last_streak_update: string | null;
  lives_remaining: number;
  created_at: string;
}

// ---------- Skills ----------

export interface Skill {
  id: string;
  course_id: string;
  name: string;
  description: string;
  prerequisites: string[];
  taught_in_lectures: string[];
  state: SkillState;
  mastery_score: number;
}

export interface SkillEdge {
  from_skill: string;
  to_skill: string;
}

export interface SkillsGraph {
  course_id: string;
  skills: Skill[];
  edges: SkillEdge[];
}

// ---------- Course / Lecture ----------

export interface Lecture {
  id: string;
  course_id: string;
  order_index: number;
  title: string;
  topics: string[];
  scheduled_date: string;
  is_exam: boolean;
  exam_type: ExamType | null;
  covers_lectures: string[] | null;
  estimated_difficulty: Difficulty | null;
}

export interface Course {
  id: string;
  user_id: string | null;
  name: string;
  theme: Theme;
  instructor: string | null;
  term: string | null;
  description: string | null;
  total_lectures: number;
  created_at: string;
}

// ---------- Theme ----------

export interface MonsterConfig {
  id: string;
  name: string;
  sprite_path: string;
  hp: number;
  attack_animation: string;
  attack_sound: string | null;
  voice_tone: string;
}

export interface ThemeSegment {
  id: string;
  range: [number, number];
  display_name?: string;
  bg_image: string;
  bg_gradient?: string;
  music: string;
  music_tone?: string;
}

export type HpTier = "low" | "medium" | "boss";

export interface ThemeMonster {
  id: string;
  name: string;
  emoji?: string;
  segment: string;
  hp_tier: HpTier;
  sprite_path: string;
  attack_animation: string;
  attack_sound: string | null;
  damage_effect: string;
  voice_tone: string;
}

export interface ThemeAvatar {
  id: string;
  name?: string;
  emoji?: string;
  sprite: string;
  attack_anim: string;
  attack_sound?: string;
  grunt?: string;
}

export interface ThemeManifest {
  theme_id: Theme;
  display_name: string;
  narrative?: string;
  segments: ThemeSegment[];
  monsters: ThemeMonster[];
  avatars: ThemeAvatar[];
  voice_tone_prompt: string;
  victory_sfx?: string;
  defeat_sfx?: string;
  correct_sfx?: string;
  wrong_sfx?: string;
}

// ---------- Level ----------

export interface Level {
  id: string;
  lecture_id: string;
  course_id: string;
  order_index: number;
  state: LevelState;
  theme_segment: string;
  monster: MonsterConfig;
  best_score: number | null;
  is_exam: boolean;
  exam_type: ExamType | null;
}

// ---------- Question / Battle ----------

export interface Question {
  id: string;
  type: QuestionType;
  difficulty: Difficulty;
  prompt: string;
  options: string[] | null;
  correct_answer: string;
  rubric: string | null;
  concepts_tested: string[];
  source_lecture_id: string;
}

export interface QuestionAttempt {
  question: Question;
  user_answer: string;
  is_correct: boolean;
  partial_credit: number;
  feedback: string;
  damage_dealt: number;
  damage_taken: number;
}

export interface Battle {
  id: string;
  level_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  outcome: BattleOutcome | null;
  user_hp_start: number;
  monster_hp_start: number;
  user_hp_end: number;
  monster_hp_end: number;
  questions: QuestionAttempt[];
  points_awarded: number;
}

// ---------- API responses ----------

export interface WorldResponse {
  course_id: string;
  theme: Theme;
  levels: Level[];
  current_level_id: string | null;
  segments: ThemeSegment[];
}

export interface StartBattleResponse {
  battle_id: string;
  initial_question: Question;
  user_hp: number;
  monster_hp: number;
  monster: MonsterConfig;
}

export interface AnswerRequest {
  question_id: string;
  answer: string;
  audio_blob_b64?: string | null;
}

export interface AnswerResponse {
  is_correct: boolean;
  partial_credit: number;
  feedback: string;
  damage_dealt: number;
  damage_taken: number;
  user_hp: number;
  monster_hp: number;
  next_question: Question | null;
  battle_outcome: BattleOutcome | null;
}

export interface BattleSummary {
  battle: Battle;
  missed_concepts: Skill[];
}

export interface ProgressResponse {
  points: number;
  streak: number;
  lives: number;
  avatar: AvatarConfig;
  recent_battles: Battle[];
}

export interface VisualizeResponse {
  svg_or_image_url: string | null;
  explanation: string;
}

export interface LevelDetailResponse {
  level: Level;
  lecture: Lecture;
  monster: MonsterConfig;
}
