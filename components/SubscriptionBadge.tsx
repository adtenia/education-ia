import type { SubscriptionPlan } from "../lib/subscription-access";

type ActiveSubscriptionPlan = Exclude<SubscriptionPlan, "none">;

type SubscriptionBadgeProps = {
  plan: ActiveSubscriptionPlan;
  compact?: boolean;
  className?: string;
};

const PLAN_STYLES = {
  standard: {
    label: "STANDARD",
    icon: "⭐",
    border: "border-sky-400/90",
    glow: "shadow-[0_12px_32px_-12px_rgba(56,189,248,0.75)]",
    iconShell: "border-sky-400 bg-sky-950/90 text-sky-300",
    title: "text-sky-100",
    check: "border-sky-300/80 bg-sky-500/20 text-sky-100",
    reflection: "from-transparent via-sky-400/15 to-sky-300/35",
  },
  premium: {
    label: "PREMIUM",
    icon: "👑",
    border: "border-amber-400/90",
    glow: "shadow-[0_12px_32px_-12px_rgba(251,191,36,0.72)]",
    iconShell: "border-amber-400 bg-amber-950/80 text-amber-300",
    title: "text-amber-100",
    check: "border-amber-300/80 bg-amber-500/20 text-amber-100",
    reflection: "from-transparent via-amber-400/15 to-amber-300/35",
  },
  pro: {
    label: "PRO",
    icon: "💎",
    border: "border-emerald-400/90",
    glow: "shadow-[0_12px_32px_-12px_rgba(52,211,153,0.72)]",
    iconShell: "border-emerald-400 bg-emerald-950/80 text-emerald-300",
    title: "text-emerald-100",
    check: "border-emerald-300/80 bg-emerald-500/20 text-emerald-100",
    reflection: "from-transparent via-emerald-400/15 to-emerald-300/35",
  },
} satisfies Record<ActiveSubscriptionPlan, Record<string, string>>;

export default function SubscriptionBadge({
  plan,
  compact = false,
  className = "",
}: SubscriptionBadgeProps) {
  const style = PLAN_STYLES[plan];

  return (
    <div
      aria-label={`${style.label}, plan actif`}
      className={`relative isolate flex w-full items-center overflow-hidden rounded-[1.45rem] border bg-[linear-gradient(115deg,#020617_0%,#0f172a_52%,#020617_100%)] text-white ring-1 ring-white/10 ${style.border} ${style.glow} ${compact ? "max-w-[17rem] gap-3 px-3.5 py-2.5" : "max-w-[22rem] gap-4 px-4 py-3.5"} ${className}`}
    >
      <span aria-hidden="true" className={`absolute inset-x-10 bottom-0 h-px bg-gradient-to-r ${style.reflection}`} />
      <span aria-hidden="true" className={`absolute -bottom-8 right-8 h-14 w-32 -rotate-6 bg-gradient-to-r blur-xl ${style.reflection}`} />

      <span
        aria-hidden="true"
        className={`relative z-10 flex shrink-0 items-center justify-center border-2 [clip-path:polygon(50%_0%,93%_25%,93%_75%,50%_100%,7%_75%,7%_25%)] ${style.iconShell} ${compact ? "h-11 w-11 text-xl" : "h-14 w-14 text-2xl"}`}
      >
        {style.icon}
      </span>

      <span className="relative z-10 min-w-0 flex-1 border-l border-white/15 pl-3.5">
        <span className={`block truncate font-black tracking-[0.1em] ${style.title} ${compact ? "text-sm" : "text-lg"}`}>
          {style.label}
        </span>
        <span className={`mt-0.5 block font-medium text-slate-300 ${compact ? "text-[0.68rem]" : "text-sm"}`}>
          Plan actif
        </span>
      </span>

      <span
        aria-hidden="true"
        className={`relative z-10 flex shrink-0 items-center justify-center rounded-full border font-black shadow-inner shadow-black/40 ${style.check} ${compact ? "h-8 w-8 text-base" : "h-10 w-10 text-xl"}`}
      >
        ✓
      </span>
    </div>
  );
}
