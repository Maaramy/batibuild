/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as access from "../access.js";
import type * as adminAnalytics from "../adminAnalytics.js";
import type * as adminNotificationRecipients from "../adminNotificationRecipients.js";
import type * as aiMaterials from "../aiMaterials.js";
import type * as aiMaterialsActions from "../aiMaterialsActions.js";
import type * as aiMaterialsEngine from "../aiMaterialsEngine.js";
import type * as analytics from "../analytics.js";
import type * as announcements from "../announcements.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as bimConfig from "../bimConfig.js";
import type * as bimEngine from "../bimEngine.js";
import type * as bimQuantitatif from "../bimQuantitatif.js";
import type * as blog from "../blog.js";
import type * as clientProCredits from "../clientProCredits.js";
import type * as costEvolution from "../costEvolution.js";
import type * as crons from "../crons.js";
import type * as customWorks from "../customWorks.js";
import type * as customWorksEngine from "../customWorksEngine.js";
import type * as decisionSupport from "../decisionSupport.js";
import type * as decisionSupportAccess from "../decisionSupportAccess.js";
import type * as dkim from "../dkim.js";
import type * as dqeEngine from "../dqeEngine.js";
import type * as emailConfig from "../emailConfig.js";
import type * as emailHistory from "../emailHistory.js";
import type * as emailNotifications from "../emailNotifications.js";
import type * as emailSender from "../emailSender.js";
import type * as emailTemplates from "../emailTemplates.js";
import type * as expertAvailability from "../expertAvailability.js";
import type * as expertProfiles from "../expertProfiles.js";
import type * as expertServiceRequests from "../expertServiceRequests.js";
import type * as expertStats from "../expertStats.js";
import type * as featureFlags from "../featureFlags.js";
import type * as http from "../http.js";
import type * as invoiceAttachment from "../invoiceAttachment.js";
import type * as invoices from "../invoices.js";
import type * as lifecycleShowcase from "../lifecycleShowcase.js";
import type * as marketData from "../marketData.js";
import type * as materialCatalog2026 from "../materialCatalog2026.js";
import type * as materialClimate from "../materialClimate.js";
import type * as materialSelectionEngine from "../materialSelectionEngine.js";
import type * as materialSelections from "../materialSelections.js";
import type * as materials from "../materials.js";
import type * as messaging from "../messaging.js";
import type * as notifications from "../notifications.js";
import type * as paymentMethodStates from "../paymentMethodStates.js";
import type * as payments from "../payments.js";
import type * as priceEngine from "../priceEngine.js";
import type * as profileSubscription from "../profileSubscription.js";
import type * as projectLimits from "../projectLimits.js";
import type * as projectNaming from "../projectNaming.js";
import type * as projectTypes from "../projectTypes.js";
import type * as projects from "../projects.js";
import type * as quantitatifCatalog from "../quantitatifCatalog.js";
import type * as quantitatifCustom from "../quantitatifCustom.js";
import type * as quantitatifCustomLogic from "../quantitatifCustomLogic.js";
import type * as quoteRequests from "../quoteRequests.js";
import type * as quoteResponses from "../quoteResponses.js";
import type * as ratings from "../ratings.js";
import type * as recommendedProviders from "../recommendedProviders.js";
import type * as reportCenter from "../reportCenter.js";
import type * as roadmap from "../roadmap.js";
import type * as roadmapData from "../roadmapData.js";
import type * as roadmapEngine from "../roadmapEngine.js";
import type * as roadmapPlaybooks from "../roadmapPlaybooks.js";
import type * as roadmapQuantitatif from "../roadmapQuantitatif.js";
import type * as seo from "../seo.js";
import type * as storageCleanup from "../storageCleanup.js";
import type * as storageReport from "../storageReport.js";
import type * as subscriptionPeriods from "../subscriptionPeriods.js";
import type * as subscriptionStatus from "../subscriptionStatus.js";
import type * as subscriptions from "../subscriptions.js";
import type * as supplierProfiles from "../supplierProfiles.js";
import type * as supplierStats from "../supplierStats.js";
import type * as suppliers from "../suppliers.js";
import type * as support from "../support.js";
import type * as technicalPlans from "../technicalPlans.js";
import type * as trialConfig from "../trialConfig.js";
import type * as userDeletion from "../userDeletion.js";
import type * as users from "../users.js";
import type * as vlyIntegrations from "../vlyIntegrations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  access: typeof access;
  adminAnalytics: typeof adminAnalytics;
  adminNotificationRecipients: typeof adminNotificationRecipients;
  aiMaterials: typeof aiMaterials;
  aiMaterialsActions: typeof aiMaterialsActions;
  aiMaterialsEngine: typeof aiMaterialsEngine;
  analytics: typeof analytics;
  announcements: typeof announcements;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  bimConfig: typeof bimConfig;
  bimEngine: typeof bimEngine;
  bimQuantitatif: typeof bimQuantitatif;
  blog: typeof blog;
  clientProCredits: typeof clientProCredits;
  costEvolution: typeof costEvolution;
  crons: typeof crons;
  customWorks: typeof customWorks;
  customWorksEngine: typeof customWorksEngine;
  decisionSupport: typeof decisionSupport;
  decisionSupportAccess: typeof decisionSupportAccess;
  dkim: typeof dkim;
  dqeEngine: typeof dqeEngine;
  emailConfig: typeof emailConfig;
  emailHistory: typeof emailHistory;
  emailNotifications: typeof emailNotifications;
  emailSender: typeof emailSender;
  emailTemplates: typeof emailTemplates;
  expertAvailability: typeof expertAvailability;
  expertProfiles: typeof expertProfiles;
  expertServiceRequests: typeof expertServiceRequests;
  expertStats: typeof expertStats;
  featureFlags: typeof featureFlags;
  http: typeof http;
  invoiceAttachment: typeof invoiceAttachment;
  invoices: typeof invoices;
  lifecycleShowcase: typeof lifecycleShowcase;
  marketData: typeof marketData;
  materialCatalog2026: typeof materialCatalog2026;
  materialClimate: typeof materialClimate;
  materialSelectionEngine: typeof materialSelectionEngine;
  materialSelections: typeof materialSelections;
  materials: typeof materials;
  messaging: typeof messaging;
  notifications: typeof notifications;
  paymentMethodStates: typeof paymentMethodStates;
  payments: typeof payments;
  priceEngine: typeof priceEngine;
  profileSubscription: typeof profileSubscription;
  projectLimits: typeof projectLimits;
  projectNaming: typeof projectNaming;
  projectTypes: typeof projectTypes;
  projects: typeof projects;
  quantitatifCatalog: typeof quantitatifCatalog;
  quantitatifCustom: typeof quantitatifCustom;
  quantitatifCustomLogic: typeof quantitatifCustomLogic;
  quoteRequests: typeof quoteRequests;
  quoteResponses: typeof quoteResponses;
  ratings: typeof ratings;
  recommendedProviders: typeof recommendedProviders;
  reportCenter: typeof reportCenter;
  roadmap: typeof roadmap;
  roadmapData: typeof roadmapData;
  roadmapEngine: typeof roadmapEngine;
  roadmapPlaybooks: typeof roadmapPlaybooks;
  roadmapQuantitatif: typeof roadmapQuantitatif;
  seo: typeof seo;
  storageCleanup: typeof storageCleanup;
  storageReport: typeof storageReport;
  subscriptionPeriods: typeof subscriptionPeriods;
  subscriptionStatus: typeof subscriptionStatus;
  subscriptions: typeof subscriptions;
  supplierProfiles: typeof supplierProfiles;
  supplierStats: typeof supplierStats;
  suppliers: typeof suppliers;
  support: typeof support;
  technicalPlans: typeof technicalPlans;
  trialConfig: typeof trialConfig;
  userDeletion: typeof userDeletion;
  users: typeof users;
  vlyIntegrations: typeof vlyIntegrations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
