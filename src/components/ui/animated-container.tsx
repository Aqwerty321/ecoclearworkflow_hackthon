"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  animation?: "fade-in" | "slide-up" | "scale-in" | "slide-down";
  delay?: number;
  duration?: number;
  once?: boolean;
}

export function AnimatedContainer({
  children,
  className,
  animation = "slide-up",
  delay = 0,
  duration = 500,
  once = true,
}: AnimatedContainerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible
          ? "translateY(0) scale(1)"
          : animation === "slide-up"
          ? "translateY(16px)"
          : animation === "slide-down"
          ? "translateY(-16px)"
          : animation === "scale-in"
          ? "scale(0.95)"
          : "none",
        transition: `opacity ${duration}ms ease-out ${delay}ms, transform ${duration}ms ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  animation?: "fade-in" | "slide-up" | "scale-in";
}

export function StaggerChildren({
  children,
  className,
  staggerDelay = 80,
  animation = "slide-up",
}: StaggerChildrenProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className}>
      {Array.isArray(children)
        ? children.map((child, i) => (
            <AnimatedContainer
              key={i}
              animation={animation}
              delay={i * staggerDelay}
            >
              {child}
            </AnimatedContainer>
          ))
        : children}
    </div>
  );
}
