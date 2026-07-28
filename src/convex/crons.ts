import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

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

export default crons;
