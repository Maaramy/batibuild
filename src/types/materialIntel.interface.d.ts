/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import type { MaterialIntelRow } from "@/lib/materialIntelligence"

export type {
  MaterialIntelRow,
}

export interface MaterialIntelRow {
  articleId: string
  designation: string
  group: string
  subcategory?: string
  unit?: string
  quantity?: number
  unitPrice?: number
  currentTotal: number
  trend?: "stable" | "hausse" | "baisse"
  directionalConfidence?: number
  priceDelta?: number
  priorYearPrice?: number
  priorYearYear?: number
  forecastPrice?: number
  forecastYear?: number
  supplierName?: string
  supplierLowPrice?: number
  supplierHighPrice?: number
  supplierCount?: number
  watchScore?: number
  riskScore?: number
  priorityScore?: number
  impactScore?: number
  exposureScore?: number
  lossAvoided?: number
  confidence?: number
  confidenceLabel?: string
  overpayRatio?: number
  savingRatio?: number
  cheapestAlternative?: string
  cheapestScenario?: string
  economicalScenarioLabel?: string
}
