import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

interface TagCarouselProps {
  onTagClick: (tag: string) => void;
  category?: string;
  scrollSpeed?: number;
}

// Define tag categories
export const TagCategories = {
  HR: "HR Agent",
  GENERAL: "General Agent",
  SALES: "Sales Agent",
};

// Define categorized tags
export const categorizedTags = {
  [TagCategories.HR]: [
    "Software engineers at FAANG with 3+ years experience",
    "Machine learning researchers with PhD from Stanford",
    "UX designers who worked at Figma or Adobe",
    "Product managers with healthcare background in Boston",
    "Remote full-stack developers with React and Node expertise",
    "Data scientists with NLP experience in San Francisco",
    "Engineering managers who led teams of 20+ people",
    "DevOps engineers with AWS certification in Seattle",
    "Frontend developers from MIT or Carnegie Mellon",
    "Technical recruiters specializing in AI talent",
  ],
  [TagCategories.GENERAL]: [
    "People who graduated from Stanford CS between 2018-2022",
    "Professionals who transitioned from finance to tech",
    "Startup founders with successful exits in healthcare",
    "YC alumni working on climate tech solutions",
    "Women in leadership roles at Fortune 500 tech companies",
    "Researchers publishing papers on LLM safety",
    "People who worked at both Google and Meta",
    "Entrepreneurs who founded companies before age 25",
    "Engineers with experience in both hardware and software",
    "Professionals with MBA from Harvard or Wharton",
  ],
  [TagCategories.SALES]: [
    "VPs of Sales at enterprise SaaS companies",
    "Decision makers in healthcare IT departments",
    "CTOs at Series B fintech startups",
    "Procurement managers at Fortune 100 companies",
    "Directors of Digital Transformation in manufacturing",
    "CIOs at educational institutions with 10,000+ students",
    "Heads of Innovation at financial institutions",
    "Technology buyers in retail with $1M+ budgets",
    "IT leaders implementing AI solutions in insurance",
    "Executives responsible for supply chain technology",
  ],
};

// Legacy tags for backward compatibility
const rawTags: string[] = [
  ...categorizedTags[TagCategories.HR],
  ...categorizedTags[TagCategories.GENERAL],
  ...categorizedTags[TagCategories.SALES],
];

const trimWords = (text: string, maxWords = 10): string =>
  text.trim().split(/\s+/).length > maxWords
    ? text.trim().split(/\s+/).slice(0, maxWords).join(" ") + "..."
    : text;

function TagCarousel({ onTagClick, category, scrollSpeed = 1 }: TagCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const rafRef = useRef<number | null>(null);

  const throttleTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = useCallback(() => {
    if (throttleTimeout.current) return;
    throttleTimeout.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
      throttleTimeout.current = null;
    }, 100);
  }, []);

  const lastScrollTime = useRef<number>(0);
  const scrollInterval = 10;
  const scrollAmount = scrollSpeed;

  // Smooth auto-scroll using requestAnimationFrame with rate limiting
  const autoScroll = useCallback(() => {
    if (!scrollRef.current || isPaused) {
      rafRef.current = requestAnimationFrame(autoScroll);
      return;
    }

    const now = Date.now();
    if (now - lastScrollTime.current > scrollInterval) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;

      if (scrollLeft >= scrollWidth - clientWidth - 10) {
        scrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }

      lastScrollTime.current = now;
    }

    rafRef.current = requestAnimationFrame(autoScroll);
  }, [isPaused]);

  useEffect(() => {
    if (!isPaused) {
      rafRef.current = requestAnimationFrame(autoScroll);
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [autoScroll, isPaused]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleMouseEnter = useCallback(() => setIsPaused(true), []);
  const handleMouseLeave = useCallback(() => setIsPaused(false), []);

  // Manual scroll
  const scroll = useCallback((direction: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -100 : 100,
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className={` w-full -mb-1.5`}>
      <div
        ref={scrollRef}
        className={`flex overflow-x-auto gap-3 py-2 px-2 scrollbar-hide `}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollBehavior: "smooth",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {useMemo(() => {
          const tagsToShow = category ? categorizedTags[category] || rawTags : rawTags;

          return tagsToShow.map((tag, index) => (
            <button
              key={index}
              onClick={() => onTagClick(tag)}
              className={`flex-shrink-0 text-[10px] rounded-full px-3 py-2 shadow-sm transition whitespace-nowrap bg-white border border-gray-300 text-gray-700 hover:bg-gray-100`}
            >
              {trimWords(tag)}
            </button>
          ));
        }, [onTagClick, category])}
      </div>
    </div>
  );
}

export default memo(TagCarousel);
