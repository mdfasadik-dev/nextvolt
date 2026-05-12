const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
;

// const gaDebugModeValue = process.env.NEXT_PUBLIC_GA_DEBUG_MODE?.trim().toLowerCase();
const gaDebugModeValue = false.toString();

export const googleAnalyticsConfig = {
    measurementId: gaMeasurementId,
    debugMode: gaDebugModeValue === "true",
} as const;

export const isGoogleAnalyticsEnabled =
    googleAnalyticsConfig.measurementId.length > 0;