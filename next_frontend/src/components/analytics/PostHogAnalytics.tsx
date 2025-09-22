"use client";

import Script from "next/script";

export default function PostHogAnalytics() {
  return (
    <Script id="posthog-analytics" strategy="beforeInteractive">
      {`
        !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
        posthog.init('phc_jVMr4nW9RU6aaIF5W4MIZGBiayFC9NtAXTk9WiUEyHN', {
            api_host: 'https://us.i.posthog.com',
            defaults: '2025-05-24',
            person_profiles: 'identified_only',
            capture_pageview: true,
            capture_pageleave: true,
            autocapture: true,
            session_recording: true,
            mask_all_inputs: false,
            mask_all_text: false,
            record_cross_domain_iframes: true,
            record_performance: true,
            record_network: true,
            // Enable heatmaps
            enable_recording_console_log: true,
            record_user_actions: true,
            capture_performance: true,
            // UTM tracking
            capture_utm: true,
            loaded: function(posthog) {
                // Extract UTM parameters from URL
                var urlParams = new URLSearchParams(window.location.search);
                var utmSource = urlParams.get('utm_source');
                var utmMedium = urlParams.get('utm_medium');
                var utmCampaign = urlParams.get('utm_campaign');
                var utmContent = urlParams.get('utm_content');
                var utmTerm = urlParams.get('utm_term');
                
                // Register UTM parameters if available
                var utmProperties = {};
                if (utmSource) utmProperties.utm_source = utmSource;
                if (utmMedium) utmProperties.utm_medium = utmMedium;
                if (utmCampaign) utmProperties.utm_campaign = utmCampaign;
                if (utmContent) utmProperties.utm_content = utmContent;
                if (utmTerm) utmProperties.utm_term = utmTerm;
                
                if (Object.keys(utmProperties).length > 0) {
                    posthog.register(utmProperties);
                }
                
                // Start session recording
                posthog.startSessionRecording();
            }
        });
      `}
    </Script>
  );
}
