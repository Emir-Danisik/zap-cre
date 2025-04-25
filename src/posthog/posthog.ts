import posthog from "posthog-js";

const POSTHOG_API_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

// Client-side PostHog
export const posthogClient = {
  init: () => {
    if (typeof window !== "undefined") {
      posthog.init(POSTHOG_API_KEY, {
        api_host: POSTHOG_HOST,
        autocapture: true,
        debug: false,
        disable_session_recording: false,
        loaded: (posthog) => {
          // Disable debug mode
          if (process.env.NODE_ENV === "development") {
            posthog.opt_out_capturing();
          }
        },
      });
    }
  },
  capture: (event: string, properties?: Record<string, any>) => {
    if (typeof window !== "undefined") {
      posthog.capture(event, properties);
    }
  },
  identify: (userId: string) => {
    if (typeof window !== "undefined") {
      posthog.identify(userId);
    }
  },
};

// Export a dummy server client that does nothing
export const posthogServerClient = {
  capture: async (
    userId: string,
    event: string,
    properties?: Record<string, any>,
  ) => {
    // No-op for server-side
    return;
  },
};
