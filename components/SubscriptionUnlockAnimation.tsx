"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";
import type { SubscriptionPlan } from "../lib/subscription-access";
import SubscriptionBadge from "./SubscriptionBadge";

type ActiveSubscriptionPlan = Exclude<SubscriptionPlan, "none">;

type SubscriptionUnlockAnimationProps = {
  plan: ActiveSubscriptionPlan;
  onPresented?: () => void;
};

const PLAN_PRESENTATION = {
  standard: {
    label: "Standard",
    particle: "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.95)]",
    text: "text-sky-100",
  },
  premium: {
    label: "Premium",
    particle: "bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.95)]",
    text: "text-amber-100",
  },
  pro: {
    label: "Pro",
    particle: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.95)]",
    text: "text-emerald-100",
  },
} satisfies Record<ActiveSubscriptionPlan, Record<string, string>>;

const PARTICLES = [
  { left: "15%", top: "24%", x: -22, y: -18, delay: 0.05, size: 5 },
  { left: "27%", top: "15%", x: -10, y: -25, delay: 0.12, size: 3 },
  { left: "43%", top: "10%", x: 2, y: -24, delay: 0.2, size: 4 },
  { left: "61%", top: "13%", x: 14, y: -23, delay: 0.08, size: 3 },
  { left: "78%", top: "25%", x: 24, y: -17, delay: 0.17, size: 5 },
  { left: "86%", top: "48%", x: 28, y: 1, delay: 0.02, size: 3 },
  { left: "77%", top: "73%", x: 22, y: 20, delay: 0.23, size: 4 },
  { left: "61%", top: "84%", x: 12, y: 25, delay: 0.11, size: 3 },
  { left: "39%", top: "87%", x: -5, y: 26, delay: 0.19, size: 5 },
  { left: "22%", top: "75%", x: -21, y: 20, delay: 0.07, size: 3 },
  { left: "11%", top: "52%", x: -28, y: 3, delay: 0.15, size: 4 },
  { left: "32%", top: "37%", x: -11, y: -8, delay: 0.25, size: 2 },
] as const;

export default function SubscriptionUnlockAnimation({
  plan,
  onPresented,
}: SubscriptionUnlockAnimationProps) {
  const reducedMotion = useReducedMotion();
  const presentation = PLAN_PRESENTATION[plan];

  useEffect(() => {
    onPresented?.();
  }, [onPresented]);

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-slate-950/55 px-5 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.15 : 0.32, ease: "easeOut" }}
      role="status"
      aria-live="polite"
    >
      <div className="relative w-full max-w-lg py-20 text-center">
        {!reducedMotion &&
          PARTICLES.map((particle, index) => (
            <motion.span
              key={`${particle.left}-${particle.top}`}
              aria-hidden="true"
              className={`absolute rounded-full ${presentation.particle}`}
              style={{
                left: particle.left,
                top: particle.top,
                width: particle.size,
                height: particle.size,
              }}
              initial={{ opacity: 0, scale: 0.2, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.2, 1.35, 0.35],
                x: particle.x,
                y: particle.y,
              }}
              transition={{
                duration: 1.55,
                delay: particle.delay + index * 0.015,
                ease: "easeOut",
              }}
            />
          ))}

        <motion.div
          className="relative z-10 mx-auto flex max-w-sm justify-center"
          initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.68, rotate: -4 }}
          animate={reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: reducedMotion ? 1 : 0.94 }}
          transition={
            reducedMotion
              ? { duration: 0.15 }
              : { type: "spring", stiffness: 180, damping: 14, mass: 0.8 }
          }
        >
          <SubscriptionBadge plan={plan} />
        </motion.div>

        <motion.div
          className="relative z-10 mt-8"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, delay: reducedMotion ? 0 : 0.35 }}
        >
          <p className={`text-2xl font-black tracking-tight sm:text-3xl ${presentation.text}`}>
            Abonnement {presentation.label} activé !
          </p>
          <p className="mt-2 text-base font-medium text-slate-200 sm:text-lg">
            Bienvenue dans EducationIA.
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
