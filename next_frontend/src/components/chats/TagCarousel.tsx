import { memo, useCallback, useMemo, useState, useRef } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { Observer } from "gsap/Observer";

gsap.registerPlugin(Observer);

interface TagCarouselProps {
  onTagClick: (tag: string) => void;
  category?: string;
  scrollSpeed?: number;
}

export const TagCategories = {
  HR: "HR Agent",
  GENERAL: "General Agent",
  SALES: "Sales Agent",
};

export const categorizedTags = {
  [TagCategories.HR]: [
    "Full-stack developers with 3+ years in MERN/MEAN stack (India/US/Remote)",
    "Data scientists with experience in NLP/Computer Vision (Global)",
    "DevOps engineers with AWS/Azure/GCP certifications (India/Global)",
    "Mobile app developers (Flutter/React Native) in Bangalore/SF/London",
    "UI/UX designers with Figma/Adobe XD experience (Remote/On-site)",
    "AI/ML engineers with Python/TensorFlow/PyTorch (India/US/UK)",
    "Product managers with 5+ years experience (IIT/IIM/Global MBA)",
    "Blockchain developers with Solidity/Rust (Global Remote)",
    "Cloud architects with multi-cloud expertise (India/Singapore/US)",
    "QA automation engineers with Selenium/Cypress (India/Europe)",
  ],
  [TagCategories.GENERAL]: [
    "IIT/NIT/BITS/Stanford/MIT graduates from 2018-2023",
    "Professionals with experience in both Indian and US tech markets",
    "Remote workers with experience in US/European/APAC timezones",
    "Women in tech leadership roles (India/Global)",
    "Developers contributing to open source projects (Global)",
    "Professionals with experience in both startups and FAANG/MNCs",
    "Tech leads with international team management experience",
    "Freelancers with 5+ years of global client experience",
    "Expats working in Indian tech companies",
    "Foreign-educated Indian professionals returned to India",
  ],
  [TagCategories.SALES]: [
    "Enterprise sales professionals in SaaS (India/US/EMEA)",
    "Key accounts managers in IT services (Global)",
    "Business development managers in fintech (India/Singapore/Dubai)",
    "Partnership managers in edtech/healthtech (APAC/Global)",
    "Sales directors in enterprise software (India/US/Europe)",
    "Channel partners for US/EU tech companies in India",
    "Pre-sales consultants in cybersecurity (Global Remote)",
    "Customer success managers in B2B tech (India/Global)",
    "Alliance managers in digital transformation (APAC/EMEA)",
    "Sales leaders with cross-border deal experience",
  ],
};

const rawTags: string[] = [
  ...categorizedTags[TagCategories.HR],
  ...categorizedTags[TagCategories.GENERAL],
  ...categorizedTags[TagCategories.SALES],
];

const trimWords = (text: string, maxWords = 8): string =>
  text.trim().split(/\s+/).length > maxWords
    ? text.trim().split(/\s+/).slice(0, maxWords).join(" ") + "..."
    : text;

function TagCarousel({ onTagClick, category, scrollSpeed = 1 }: TagCarouselProps) {
  const tagsToShow = useMemo(
    () => (category ? categorizedTags[category] || rawTags : rawTags),
    [category]
  );

  const renderTag = useCallback(
    (tag: string, index: number) => (
      <motion.button
        key={index}
        onClick={() => onTagClick(tag)}
        className="flex-shrink-0 text-xs md:text-sm rounded-full px-4 py-1.5 shadow-sm transition-all whitespace-nowrap 
        bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-blue-200
        hover:shadow-md hover:scale-105 active:scale-95"
        whileHover={{
          y: -2,
          boxShadow: "0 4px 12px rgba(99, 102, 241, 0.15)",
        }}
        whileTap={{ scale: 0.98 }}
      >
        {trimWords(tag)}
      </motion.button>
    ),
    [onTagClick]
  );

  const infiniteTags = useMemo(() => {
    return [...tagsToShow, ...tagsToShow, ...tagsToShow];
  }, [tagsToShow]);

  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  return (
    <div
      className="w-full relative group"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-blue-50 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-purple-50 to-transparent z-10 pointer-events-none" />

      <div className="overflow-hidden py-1.5 px-2">
        <div
          ref={containerRef}
          className="flex gap-3 w-max"
          style={{
            animation: `scroll ${60 / scrollSpeed}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
            willChange: "transform",
          }}
        >
          {infiniteTags.map((tag, index) => (
            <div key={`${index}-${tag.substring(0, 10)}`} className="flex-shrink-0">
              {renderTag(tag, index)}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(calc(-100% / 3));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .flex {
            animation: none !important;
            justify-content: center;
            flex-wrap: wrap;
            width: 100%;
            transform: none !important;
          }
        }

        /* Ensure smooth animation */
        .flex {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          -webkit-transform-style: preserve-3d;
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
}

export default memo(TagCarousel);
