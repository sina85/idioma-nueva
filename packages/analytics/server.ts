import "server-only";
import { PostHog } from "posthog-node";
import { keys } from "./keys";

let _analytics: PostHog | null = null;

function getAnalytics(): PostHog {
  if (!_analytics) {
    _analytics = new PostHog(keys().NEXT_PUBLIC_POSTHOG_KEY, {
      host: keys().NEXT_PUBLIC_POSTHOG_HOST,

      // Don't batch events and flush immediately - we're running in a serverless environment
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _analytics;
}

export const analytics = new Proxy({} as PostHog, {
  get(_, prop) {
    return getAnalytics()[prop as keyof PostHog];
  },
});
