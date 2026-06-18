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
export function CountUp({ value, duration = 1.1, decimals = 0, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const target = Number(value) || 0;
    const controls = animate(0, target, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString();
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
