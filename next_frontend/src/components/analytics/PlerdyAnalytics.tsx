"use client";

import Script from "next/script";

/**
 * PlerdyAnalytics Component
 * 
 * This component integrates Plerdy heatmap and session recording analytics.
 * Plerdy provides heatmaps, session recordings, and user behavior analysis
 * which can be valuable for SEO optimization and UX improvements.
 */
export default function PlerdyAnalytics() {
  return (
    <Script
      id="plerdy-analytics"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          var _protocol="https:"==document.location.protocol?"https://":"http://";
          _site_hash_code = "ea8e26cdbb41c6a5ee65e3e4d7382623",_suid=66060, plerdyScript=document.createElement("script");
          plerdyScript.setAttribute("defer",""),plerdyScript.dataset.plerdymainscript="plerdymainscript",
          plerdyScript.src="https://a.plerdy.com/public/js/click/main.js?v="+Math.random();
          var plerdymainscript=document.querySelector("[data-plerdymainscript='plerdymainscript']");
          plerdymainscript&&plerdymainscript.parentNode.removeChild(plerdymainscript);
          try{document.head.appendChild(plerdyScript)}catch(t){console.log(t,"unable add script tag")}
        `
      }}
    />
  );
}
