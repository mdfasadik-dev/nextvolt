import { GoogleAnalytics } from "@next/third-parties/google";
import {
    googleAnalyticsConfig,
    isGoogleAnalyticsEnabled,
} from "@/lib/analytics/config";

export function GoogleAnalyticsProvider() {
    if (!isGoogleAnalyticsEnabled) {
        return null;
    }

    return (
        <GoogleAnalytics
            gaId={googleAnalyticsConfig.measurementId}
            debugMode={googleAnalyticsConfig.debugMode}
        />
    );
}