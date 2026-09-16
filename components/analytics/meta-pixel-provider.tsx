"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, Suspense } from "react";
import {
  META_PIXEL_ID,
  isMetaPixelEnabled,
  pageview,
} from "@/lib/analytics/meta-pixel";

function MetaPixelTracker() {
  const pathname = usePathname();
  const lastPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    if (lastPathname.current === null) {
      // First render: initial PageView is already fired by the inline script
      lastPathname.current = pathname;
      return;
    }

    // Only fire PageView when the pathname actually changes to a new route
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname;
      pageview();
    }
  }, [pathname]);

  return null;
}

export function MetaPixelProvider() {
  if (!isMetaPixelEnabled) {
    return null;
  }

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('set', 'autoConfig', false, '${META_PIXEL_ID}');
            fbq('init', '${META_PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <Suspense fallback={null}>
        <MetaPixelTracker />
      </Suspense>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
