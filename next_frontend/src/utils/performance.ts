/**
 * Performance utilities to prevent layout thrashing and forced reflows
 */

/**
 * Batch DOM reads and writes to prevent forced reflows
 * Use this when you need to read and write DOM properties in sequence
 */
export const batchDOMOperations = (
  reads: Array<() => void>,
  writes: Array<() => void>
) => {
  // Perform all reads first
  reads.forEach(read => read());
  
  // Then perform all writes
  requestAnimationFrame(() => {
    writes.forEach(write => write());
  });
};

/**
 * Debounce function to prevent excessive calculations
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function to limit execution rate
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Use Intersection Observer for lazy operations
 * Better than scroll listeners for performance
 */
export const observeElement = (
  element: Element,
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(callback);
  }, options);
  
  observer.observe(element);
  
  return () => observer.disconnect();
};

/**
 * Measure performance of a function
 */
export const measurePerformance = async <T>(
  name: string,
  fn: () => T | Promise<T>
): Promise<T> => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  
  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
  }
  
  return result;
};

/**
 * Get element dimensions without causing reflow
 * Uses getBoundingClientRect which is optimized
 */
export const getElementDimensions = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
  };
};

/**
 * Preload critical resources
 */
export const preloadResource = (href: string, as: string) => {
  if (typeof document === "undefined") return;
  
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
};
