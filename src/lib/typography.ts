// ============================================================================
// Global typography tokens — Batibuild
// ============================================================================
// Single source of truth for responsive font sizes + line-height scale.
// Used by `src/index.css` and by the shadcn/ui components when we need a
// shared reference instead of repeating raw pixel values everywhere.
//
// Scale is intentionally sized for clear, readable UI close to modern mobile
// reading apps: readable body text on mobile, calm spacing, strong hierarchy.
// ============================================================================

/** Base/16px reference for the design tokens below.
 *  In this project `text-base` == 1rem == 16px, so the tokens stay aligned
 *  with Tailwind's default scale while still being explicit about intent. */
export const FONT_BASE = 16;

/** Responsive font-size tokens (px intent, rendered via Tailwind). */
export const FONT = {
  /** 14–15px intended — secondary text, labels, small UI. */
  xs: "15px",
  /** 15–16px intended — supporting text that still needs to be readable. */
  sm: "16px",
  /** 16–17px intended — primary body text. */
  md: "16px",
  /** 17–18px intended — emphasized body / card text. */
  lg: "17px",
  /** 18–21px intended — subtitles / card headings. */
  xl: "20px",
  /** 22–26px intended — section titles. */
  "2xl": "24px",
  /** 26–32px intended — page titles. */
  "3xl": "30px",
  /** 32–36px max — hero / very large titles (used sparingly). */
  "4xl": "34px",
} as const;

/** Line-height scale. */
export const LEADING = {
  /** Body text: calm reading. */
  body: 1.55,
  /** Slightly tighter but still readable body. */
  bodyTight: 1.45,
  /** Headings: tighter tracking/leading but not cramped. */
  heading: 1.25,
  /** Labels / buttons: compact but not cramped. */
  label: 1.35,
  /** Micro/eyebrow lines: tighter. */
  micro: 1.4,
} as const;

/** Spacing helpers expressed in px for clarity (not Tailwind utilities). */
export const SPACE = {
  /** Card padding comfortable enough to breathe on mobile. */
  cardPadding: "18px",
  /** Section gap between logical blocks. */
  sectionGap: "22px",
  /** Paragraph spacing within a section. */
  paragraphGap: "14px",
} as const;
