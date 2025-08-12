"use client";

import React, { ReactNode, useRef } from "react";
import { AnimatePresence, useInView, motion, MotionProps, useReducedMotion, UseInViewOptions } from "framer-motion";

/**
 * Types for our animation components
 */
interface TransitionProps {
  /** Child elements to be animated */
  children: ReactNode;
  /** Optional className for styling */
  className?: string;
  /** Element type to render (defaults to motion.main) */
  as?: React.ElementType;
  /** Animation duration in seconds */
  duration?: number;
  /** Animation delay in seconds */
  delay?: number;
  /** Easing function for the animation */
  ease?: number[] | string;
  /** Additional motion props to pass to the component */
  motionProps?: MotionProps;
}

interface RevealProps extends TransitionProps {
  /** Direction from which the element enters */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Distance in pixels for the animation */
  distance?: number;
  /** Threshold for triggering the animation (0-1) */
  threshold?: number;
  /** Margin around the element for triggering the animation */
  margin?: UseInViewOptions["margin"];
}

interface StaggerProps<T> {
  /** Array of items to render with staggered animation */
  items: T[];
  /** Function to render each item */
  render: (item: T, index: number) => ReactNode;
  /** Optional className for the container */
  className?: string;
  /** Element type for the container (defaults to motion.ul) */
  as?: React.ElementType;
  /** Delay between each item's animation in seconds */
  staggerDelay?: number;
  /** Optional className for each child item */
  childClassName?: string;
  /** Element type for each child (defaults to motion.li) */
  childAs?: React.ElementType;
  /** Threshold for triggering the animation (0-1) */
  threshold?: number;
  /** Additional motion props to pass to the container */
  motionProps?: MotionProps;
}

/**
 * PageTransition component for smooth page transitions
 * Wraps content in an AnimatePresence with fade and blur effects
 * Respects user's reduced motion preferences
 * 
 * @example
 * ```tsx
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 * ```
 */
export function PageTransition({
  children,
  className = "",
  as: Component = motion.main,
  duration = 0.45,
  delay = 0,
  ease = [0.22, 1, 0.36, 1],
  motionProps = {}
}: TransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  
  const variants = {
    initial: prefersReducedMotion 
      ? { opacity: 0 } 
      : { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: prefersReducedMotion 
      ? { opacity: 1 } 
      : { opacity: 1, y: 0, filter: "blur(0px)" },
    exit: prefersReducedMotion 
      ? { opacity: 0 } 
      : { opacity: 0, y: -12, filter: "blur(6px)" }
  };
  
  return (
    <AnimatePresence mode="wait">
      <Component
        className={className}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={variants}
        transition={{ duration, delay, ease }}
        {...motionProps}
      >
        {children}
      </Component>
    </AnimatePresence>
  );
}

/**
 * Reveal component for revealing elements when they enter the viewport
 * Uses useInView hook to detect when element is in view
 * Supports different reveal directions and respects reduced motion preferences
 * 
 * @example
 * ```tsx
 * <Reveal direction="up" delay={0.2}>
 *   <YourContent />
 * </Reveal>
 * ```
 */
export function Reveal({
  children,
  className = "",
  as: Component = motion.div,
  delay = 0,
  duration = 0.5,
  ease = [0.22, 1, 0.36, 1],
  direction = 'up',
  distance = 14,
  threshold = 0.1,
  margin = "-10% 0px -10% 0px",
  motionProps = {}
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin, once: true, amount: threshold });
  const prefersReducedMotion = useReducedMotion();
  
  // Determine direction of animation
  const getDirectionalProps = () => {
    if (prefersReducedMotion) return {};
    
    switch (direction) {
      case 'down': return { y: -distance };
      case 'left': return { x: distance };
      case 'right': return { x: -distance };
      case 'up':
      default: return { y: distance };
    }
  };
  
  const initial = { opacity: 0, ...getDirectionalProps() };
  
  return (
    <Component
      ref={ref}
      className={className}
      initial={initial}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : initial}
      transition={{ duration, delay, ease }}
      {...motionProps}
    >
      {children}
    </Component>
  );
}

/**
 * Stagger component for staggered animations of list items
 * Takes an array of items and a render function
 * Supports customization of stagger delay and container/item elements
 * 
 * @example
 * ```tsx
 * <Stagger
 *   items={['Item 1', 'Item 2', 'Item 3']}
 *   render={(item) => <div>{item}</div>}
 * />
 * ```
 */
export function Stagger<T>({
  items,
  render,
  className = "",
  as: Component = motion.ul,
  staggerDelay = 0.06,
  childClassName = "",
  childAs: ChildComponent = motion.li,
  threshold = 0.2,
  motionProps = {}
}: StaggerProps<T>) {
  const prefersReducedMotion = useReducedMotion();
  
  // Define variants based on reduced motion preference
  const containerVariants = {
    hidden: {},
    show: {
      transition: { staggerChildren: prefersReducedMotion ? 0 : staggerDelay }
    }
  };
  
  // Define item variants with reduced or full animation based on user preference
  const itemVariants = {
    hidden: prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
    }
  };
  
  // If there are no items, don't render anything
  if (items.length === 0) return null;

  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: threshold }}
      variants={containerVariants}
      {...motionProps}
    >
      {items.map((item, i) => (
        <ChildComponent
          key={i}
          className={childClassName}
          variants={itemVariants}
        >
          {render(item, i)}
        </ChildComponent>
      ))}
    </Component>
  );
}
