// Rate limiting configuration for email batching
export const EMAIL_BATCH_CONFIG = {
  BATCH_SIZE: 10, // Send 10 emails per batch
  BATCH_DELAY: 2000, // 2 seconds between batches
  MAX_RETRIES: 3,
  INITIAL_BACKOFF: 1000, // 1 second initial backoff
  MAX_BACKOFF: 30000, // 30 seconds max backoff
  BACKOFF_MULTIPLIER: 2,
};

// Resend rate limits for reference
export const RESEND_LIMITS = {
  FREE_TIER: {
    DAILY: 100,
    MONTHLY: 3000,
  },
  PRO_TIER: {
    MONTHLY: 50000,
  },
};
