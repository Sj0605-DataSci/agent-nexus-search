"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/**
 * AnalyticsLoader - Lazy loads all analytics scripts after page interactive
 * Follows Single Responsibility Principle: Only handles analytics loading
 * Reduces main thread blocking by deferring non-critical analytics
 */
export default function AnalyticsLoader() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Defer analytics loading until after page is interactive
    if (document.readyState === "complete") {
      setShouldLoad(true);
    } else {
      const handleLoad = () => setShouldLoad(true);
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  if (!shouldLoad) return null;

  return (
    <>
      {/* Google Analytics - Deferred */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-QBR7Y97M46"
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-QBR7Y97M46');
        `}
      </Script>

      {/* PostHog Analytics - Deferred with lazy loading */}
      <Script id="posthog-analytics" strategy="lazyOnload">
        {`
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init Ce js Ls Te Fs Ds capture Ye calculateEventProperties zs register register_once register_for_session unregister unregister_for_session Ws getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey canRenderSurvey canRenderSurveyAsync identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Bs Us createPersonProfile Hs Ms Gs opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing Ns debug L qs getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          posthog.init('phc_jVMr4nW9RU6aaIF5W4MIZGBiayFC9NtAXTk9WiUEyHN', {
            api_host: 'https://us.i.posthog.com',
            person_profiles: 'identified_only',
            capture_pageview: true,
            capture_pageleave: true,
            autocapture: true,
            session_recording: {
              enabled: true,
              maskAllInputs: false,
              maskTextSelector: ".ph-no-capture",
            },
            capture_utm: true,
            loaded: function(posthog) {
              posthog.startSessionRecording();
            }
          })
        `}
      </Script>

      {/* Plerdy Analytics - Deferred */}
      <Script
        id="plerdy-analytics"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `
            var _protocol="https:"==document.location.protocol?"https://":"http://";
            _site_hash_code = "ea8e26cdbb41c6a5ee65e3e4d7382623",_suid=66060, plerdyScript=document.createElement("script");
            plerdyScript.setAttribute("defer",""),plerdyScript.dataset.plerdymainscript="plerdymainscript",
            plerdyScript.src="https://a.plerdy.com/public/js/click/main.js?v="+Math.random();
            var plerdymainscript=document.querySelector("[data-plerdymainscript='plerdymainscript']");
            plerdymainscript&&plerdymainscript.parentNode.removeChild(plerdymainscript);
            try{document.head.appendChild(plerdyScript)}catch(t){console.log(t,"unable add script tag")}
          `,
        }}
      />
    </>
  );
}
