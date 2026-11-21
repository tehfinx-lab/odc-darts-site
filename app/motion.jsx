"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, animate } from "framer-motion";

/**
 * ODC MOTION KIT
 * Drop-in animation components that work with your existing Framer Motion.
 *
 * 1. <CountUp value={123} />        — numbers count up when they scroll into view
 * 2. <AnimatedStat .../>            — SmallStat with a count-up value
 * 3. <Reveal>...</Reveal>           — fade+rise children as they enter view
 * 4. <StaggerRows> + <Row>          — table rows cascade in
 */

// ---- Count-up number ----
// Always shows the real number (also in the server HTML, so Google and slow
// phones never see 0). The count-up is only a bonus when it scrolls into view.
export function CountUp({ value, duration = 1.1, decimals = 0, suffix = "", prefix = "" }) {
  const target = Number(value) || 0;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(target);
  const hasAnimated = useRef(false);
  const last = useRef(target);

  useEffect(() => {
    if (!inView) {
      setDisplay(target);
      last.current = target;
      return;
    }
    const from = hasAnimated.current ? last.current : 0;
    hasAnimated.current = true;
    last.current = target;
    if (from === target) {
      setDisplay(target);
      return;
    }
    const controls = animate(from, target, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setDisplay(v),
      onComplete: () => setDisplay(target),
    });
    // Safety net: whatever happens to the animation, land on the real number.
    const t = setTimeout(() => setDisplay(target), duration * 1000 + 300);
    return () => {
      controls.stop();
      clearTimeout(t);
      setDisplay(target);
    };
  }, [inView, target, duration]);

  const formatted = decimals > 0 ? Number(display).toFixed(decimals) : Math.round(display).toLocaleString();
  return <span ref={ref}>{prefix}{formatted}{suffix}</span>;
}

// ---- Reveal wrapper (fade + rise on scroll-in) ----
export function Reveal({ children, delay = 0, y = 18, className = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ---- Staggered table body ----
export function StaggerRows({ children }) {
  return (
    <motion.tbody
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.04 } },
      }}
    >
      {children}
    </motion.tbody>
  );
}

export function Row({ children, className = "" }) {
  return (
    <motion.tr
      variants={{
        hidden: { opacity: 0, x: -12 },
        show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.tr>
  );
}

// ---- Animated stat card (count-up value) ----
export function AnimatedStatValue({ value, decimals = 0 }) {
  // numeric? animate it. non-numeric (e.g. "Live", "+4")? show as-is.
  const num = Number(value);
  if (!isFinite(num) || value === "" || value === null || value === undefined) {
    return <>{value ?? "-"}</>;
  }
  return <CountUp value={num} decimals={decimals} />;
}
