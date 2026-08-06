export const LEARNING_EVENT_TYPES = [
  "course_generated",
  "quiz_completed",
  "revision_sheet_generated",
  "mind_map_generated",
  "revision_session_completed",
  "mock_exam_completed",
  "holiday_workbook_generated",
  "daily_challenge_completed",
  "achievement_unlocked",
] as const;

export type LearningEventType = (typeof LEARNING_EVENT_TYPES)[number];

export type LearningEvent = {
  id: string;
  userId: string;
  eventType: LearningEventType | string;
  courseId: string | null;
  quizId: string | null;
  score: number | null;
  durationSeconds: number;
  idempotencyKey: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
};

export type UserProgressStats = {
  userId: string;
  totalCourses: number;
  totalQuizzes: number;
  totalRevisionSheets: number;
  totalMindMaps: number;
  averageQuizScore: number | null;
  bestQuizScore: number | null;
  lastActivityAt: string | null;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  totalRevisionSeconds: number;
  futureCounters: Record<string, number>;
  updatedAt: string;
};

export type DailyActivity = {
  userId: string;
  activityDate: string;
  eventsCount: number;
  revisionSeconds: number;
  firstActivityAt: string;
  lastActivityAt: string;
};

export type RevisionSessionStatus = "active" | "completed" | "abandoned";

export type RevisionSession = {
  id: string;
  userId: string;
  courseId: string | null;
  activityType: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  status: RevisionSessionStatus;
  metadata: Record<string, unknown>;
};
