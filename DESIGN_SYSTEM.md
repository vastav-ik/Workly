# Design System - Workly

This document outlines the UI design tokens, typography scale, component layout spacing, and dynamic theme structures used in the Workly mobile client. The styling framework is built on **NativeWind** (Tailwind CSS for React Native).

---

## 1. Color Palette

Workly uses a curated dark-first palette to provide a sleek, premium experience that reduces eye strain for college students.

### A. Neutrals (Dark & Light)
*   `neutral-900` (`#121212`): Main application background.
*   `neutral-800` (`#1e1e1e`): Container & card background.
*   `neutral-700` (`#495057`): Borders and divider lines.
*   `neutral-600` (`#6c757d`): Muted text, disabled buttons.
*   `neutral-500` (`#adb5bd`): Default icon/sub-indicator color.
*   `neutral-400` (`#ced4da`): Light text secondary.
*   `neutral-300` (`#dee2e6`): Light border secondary.
*   `neutral-200` (`#e9ecef`): Light card background.
*   `neutral-100` (`#f1f3f5`): Light body background.
*   `neutral-50`  (`#f8f9fa`): Active light state indicator.

### B. Module Accent System (Context-Aware Branding)
Workly dynamically adjusts its primary accents based on the user's current task (or active navigation tab). This creates a context-aware visual identity:

| Module Context | NativeWind Class | Hex Code | Primary Placement | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Social** | `brand-social` | `#e1306c` | Feed, Posts, Likes | Vibrant Instagram pink for community feed. |
| **Academic** | `brand-academic` | `#7289da` | Spaces, Chat | Classic Discord blue for academic spaces & chat. |
| **Career** | `brand-career` | `#0077b5` | Notes, Matchmaking | Professional LinkedIn blue for note trades & team search. |
| **Premium** | `brand-premium` | `#ffb703` | Wallet, Subscription | Golden yellow highlighting elite features. |
| **Neutral** | `neutral-600` | `#6c757d` | Settings, Help | Soft gray for generic utilities. |

---

## 2. Typography

Workly uses **Inter** (complemented by default platform fallbacks like `system-ui` and `-apple-system`) to guarantee high legibility on high-DPI screens.

### Font Sizes:
*   `text-xs` (12px): Sub-captions, timestamps, small tags.
*   `text-sm` (14px): Secondary content, user handles, form field labels.
*   `text-base` (16px): Main body text, comment content, text inputs.
*   `text-lg` (18px): Card headers, list items, action labels.
*   `text-xl` (20px): Section headers, modal titles.
*   `text-2xl` (24px): Primary page headings, numeric dashboard totals.

---

## 3. Borders & Spacing

To keep cards looking consistent and interactive widgets looking modern, we follow these roundness rules:

*   **Cards:** `rounded-card` (`16px`) - Used for feed cards, marketplace note cards, and matchmaking tickets.
*   **Inputs:** `rounded-input` (`12px`) - Used for text boxes, search filters, and profile dropdowns.
*   **Buttons:** `rounded-full` or `rounded-input` depending on emphasis level (e.g. pill-shaped action buttons vs. square-ish primary CTA buttons).

---

## 4. Theme & State Management

Dynamic theme variables are managed via the `ThemeProvider` (`/src/components/ThemeProvider.tsx`). Developers can use the custom `useTheme()` hook to access current contexts:

```typescript
const { module, accentText, accentBg, accent } = useTheme();

// Example usage:
<Text className={`${accentText} font-semibold`}>
  {tab.label}
</Text>
```

When rendering screen elements:
*   **Active States:** Always highlight using the dynamic `accentText` or `accentBg` class.
*   **Hover/Pressed States:** Use subtle micro-animations (e.g., `opacity-80` or scaling on touch) to keep user interaction feeling smooth and premium.
