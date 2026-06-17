"use client";

import { useEffect, useState } from "react";

export function CountUp({ value, duration = 1000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = Number(value);

    if (isNaN(target)) {
      setCount(value);
      return;
    }

    let start = 0;
    const steps = 30;
    const increment = target / steps;

    const timer = setInterval(() => {
      start += increment;

      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, duration]);

  return <>{count}</>;
}


export function AnimatedStatValue({ value }) {
  const number = Number(value);

  if (!isNaN(number)) {
    return <CountUp value={number} />;
  }

  return <>{value}</>;
}


export function Reveal({ children, className = "" }) {
  return (
    <div
      className={`animate-fadeIn ${className}`}
      style={{
        animationDuration: "0.6s",
        animationFillMode: "forwards",
      }}
    >
      {children}
    </div>
  );
}


export function StaggerRows({ children }) {
  return <tbody>{children}</tbody>;
}


export function Row({ children, className = "" }) {
  return (
    <tr
      className={className}
      style={{
        animation: "fadeIn 0.5s ease forwards",
      }}
    >
      {children}
    </tr>
  );
}
