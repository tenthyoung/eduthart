import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache is configured: the site renders pages on request and
// does not use ISR. Add an R2 cache here if that changes.
export default defineCloudflareConfig();
