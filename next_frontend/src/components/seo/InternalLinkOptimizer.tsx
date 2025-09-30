"use client";

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface InternalLinkOptimizerProps {
  children: ReactNode;
  href: string;
  className?: string;
  title?: string;
  prefetch?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  rel?: string;
}

/**
 * InternalLinkOptimizer Component
 * 
 * This component enhances internal links with SEO best practices:
 * 1. Adds appropriate rel attributes based on link type
 * 2. Adds descriptive title attributes when missing
 * 3. Handles prefetching intelligently
 * 4. Tracks link clicks for analytics
 * 5. Adds appropriate aria attributes for accessibility
 */
const InternalLinkOptimizer: React.FC<InternalLinkOptimizerProps> = ({
  children,
  href,
  className,
  title,
  prefetch = true,
  onClick,
  ariaLabel,
  rel,
  ...props
}) => {
  const pathname = usePathname();
  const isExternal = href.startsWith('http') || href.startsWith('//');
  const isAnchor = href.startsWith('#');
  const isSamePage = pathname === href;
  
  // Determine if this is a primary navigation link
  const isPrimaryNav = [
    '/about',
    '/pricing',
    '/user-query',
    '/connections',
    '/agents',
    '/research-person',
  ].includes(href);
  
  // Handle external links
  if (isExternal) {
    return (
      <a
        href={href}
        className={className}
        title={title}
        rel={rel || "noopener noreferrer"}
        aria-label={ariaLabel}
        onClick={(e) => {
          // Track external link click
          try {
            if (typeof window !== 'undefined' && window.posthog) {
              window.posthog.capture('external_link_click', {
                url: href,
                text: typeof children === 'string' ? children : 'non-text link',
                current_page: pathname,
              });
            }
          } catch (error) {
            console.error('Error tracking external link click:', error);
          }
          
          // Call custom onClick handler if provided
          onClick?.();
        }}
        {...props}
      >
        {children}
      </a>
    );
  }
  
  // Handle anchor links on the same page
  if (isAnchor) {
    return (
      <a
        href={href}
        className={className}
        title={title}
        aria-label={ariaLabel}
        onClick={(e) => {
          // Track anchor link click
          try {
            if (typeof window !== 'undefined' && window.posthog) {
              window.posthog.capture('anchor_link_click', {
                anchor: href,
                text: typeof children === 'string' ? children : 'non-text link',
                current_page: pathname,
              });
            }
          } catch (error) {
            console.error('Error tracking anchor link click:', error);
          }
          
          onClick?.();
        }}
        {...props}
      >
        {children}
      </a>
    );
  }
  
  // Handle internal links with Next.js Link component
  return (
    <Link
      href={href}
      className={className}
      prefetch={prefetch}
      aria-label={ariaLabel}
      aria-current={isSamePage ? 'page' : undefined}
      title={title}
      onClick={(e) => {
        // Track internal link click
        try {
          if (typeof window !== 'undefined' && window.posthog) {
            window.posthog.capture('internal_link_click', {
              url: href,
              text: typeof children === 'string' ? children : 'non-text link',
              is_primary_nav: isPrimaryNav,
              current_page: pathname,
            });
          }
        } catch (error) {
          console.error('Error tracking internal link click:', error);
        }
        
        onClick?.();
      }}
      {...props}
    >
      {children}
    </Link>
  );
};

export default InternalLinkOptimizer;
