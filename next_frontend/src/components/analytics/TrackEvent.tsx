"use client";

import { ReactNode, cloneElement, isValidElement, useEffect, ReactElement } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

type EventType = "click" | "hover" | "focus" | "blur" | "submit" | "view";

interface TrackEventProps {
  /**
   * The name of the event to track
   */
  eventName: string;

  /**
   * Additional properties to include with the event
   */
  properties?: Record<string, any>;

  /**
   * The type of event to track (default: 'click')
   */
  eventType?: EventType;

  /**
   * Whether to include the current path in the event properties
   */
  includePathInfo?: boolean;

  /**
   * Whether to debounce the event (useful for events that might fire rapidly)
   */
  debounce?: boolean;

  /**
   * Debounce delay in milliseconds (default: 300)
   */
  debounceDelay?: number;

  /**
   * The element to track events for
   */
  children: ReactNode;
}

/**
 * A component that tracks events when its children are interacted with
 *
 * @example
 * ```jsx
 * // Track clicks
 * <TrackEvent eventName="button_clicked" properties={{ buttonType: 'primary' }}>
 *   <Button>Click Me</Button>
 * </TrackEvent>
 *
 * // Track form submissions
 * <TrackEvent eventName="form_submitted" eventType="submit">
 *   <form>...</form>
 * </TrackEvent>
 *
 * // Track when an element is viewed
 * <TrackEvent eventName="section_viewed" eventType="view">
 *   <section>...</section>
 * </TrackEvent>
 * ```
 */
export function TrackEvent({
  eventName,
  properties = {},
  eventType = "click",
  includePathInfo = true,
  debounce = false,
  debounceDelay = 300,
  children,
}: TrackEventProps) {
  const pathname = usePathname();

  if (!isValidElement(children)) {
    console.warn("TrackEvent: Children must be a valid React element");
    return <>{children}</>;
  }

  // Create enhanced properties with path info if requested
  const enhancedProperties = {
    ...properties,
    ...(includePathInfo ? { path: pathname } : {}),
    timestamp: new Date().toISOString(),
  };

  // Debounce function for events that might fire rapidly
  const debounceEvent = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Track view events using useEffect
  useEffect(() => {
    if (eventType === "view") {
      posthog.capture(eventName, enhancedProperties);
    }
  }, [eventType, eventName, pathname]);

  // Handle different event types
  const createEventHandler = (type: EventType, originalHandler?: Function) => {
    const eventHandler = (e: any) => {
      posthog.capture(eventName, enhancedProperties);
      if (originalHandler) originalHandler(e);
    };

    return debounce ? debounceEvent(eventHandler, debounceDelay) : eventHandler;
  };

  // Map event types to prop names
  const eventPropMap: Record<EventType, string> = {
    click: "onClick",
    hover: "onMouseEnter",
    focus: "onFocus",
    blur: "onBlur",
    submit: "onSubmit",
    view: "", // Handled by useEffect
  };

  // Skip for view events as they're handled by useEffect
  if (eventType === "view") {
    return children;
  }

  // Cast children to ReactElement to access props safely
  const child = children as ReactElement<any>;
  const propName = eventPropMap[eventType];
  const originalHandler = child.props[propName];

  // Create props object with our event handler
  const eventProps = {
    [propName]: createEventHandler(eventType, originalHandler),
  };

  // Clone the child element and add our event handler
  return cloneElement(children, eventProps);
}

export default TrackEvent;
