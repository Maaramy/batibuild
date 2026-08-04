import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { mutation } from "./_generated/server";

const crons = cronJobs();

// Update material prices automatically on the 1st of each month at midnight
// Cron expression: minute hour day-of-month month day-of-week
crons.cron(
  "monthly-price-update",
  "0 0 1 * *",
  internal.materials.updateAllMaterialPrices,
);

// Monthly BIM data refresh (market prices, region multipliers, unit prices)
// Runs on the 1st of each month at 01:00 AM (1 hour after price update)
crons.cron(
  "monthly-bim-refresh",
  "0 1 1 * *",
  internal.bimConfig.refreshBIMDataMonthly,
);

// Daily supplier subscription check (trial ending, subscription expiring, etc.)
// Runs every day at 08:00 AM
crons.cron(
  "daily-supplier-check",
  "0 8 * * *",
  (internal as any).supplierProfiles.checkSupplierNotifications,
);

// Weekly orphaned-file purge (receipts, avatars, project files, reports)
// Runs every Sunday at 03:00 AM to clean up files no longer referenced in the DB
crons.cron(
  "weekly-orphan-purge",
  "0 3 * * 0",
  internal.storageCleanup.purgeOrphanedFiles,
);

// Daily subscription expiry check — marks expired subscriptions (members +
// suppliers) and sends automatic email notifications
// Runs every day at 06:00 AM
crons.cron(
  "daily-email-expiry-check",
  "0 6 * * *",
  internal.emailNotifications.checkExpiredSubscriptions,
);

// Weekly market intelligence sync — refreshes material offers with price drift,
// stock changes and logs price history for the analytics/trends module
// Runs every Monday at 04:00 AM
crons.cron(
  "weekly-market-sync",
  "0 4 * * 1",
  internal.marketData.runMarketSyncInternal,
);

export default crons;
