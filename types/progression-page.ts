export type ProgressSummary = {
  totalCourses: number;
  totalQuizzes: number;
  totalRevisionSheets: number;
  totalMindMaps: number;
  averageQuizScore: number | null;
  bestQuizScore: number | null;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
};

export type QuizAttemptView = {
  id: string;
  quizId: string | null;
  title: string;
  courseTitle: string | null;
  score: number;
  occurredAt: string;
  attemptNumber: number;
  delta: number | null;
};

export type ProgressChartPoint = {
  id: string;
  label: string;
  score: number;
};

export type RecentActivityView = {
  id: string;
  label: string;
  detail: string | null;
  occurredAt: string;
};

export type DailyActivityView = {
  date: string;
  label: string;
  eventsCount: number;
  active: boolean;
};

export type WeakPointView = {
  key: string;
  title: string;
  courseTitle: string | null;
  averageScore: number;
  latestScore: number;
  attemptsCount: number;
};

export type TopicProgressView = {
  key: string;
  title: string;
  answeredQuestions: number;
  errorCount: number;
  successRate: number;
  distinctAttempts: number;
  lastErrorAt: string | null;
  lastSuccessAt: string | null;
};
