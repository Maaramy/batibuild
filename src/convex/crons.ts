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

export default crons;
