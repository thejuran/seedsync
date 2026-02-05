# Phase 11: Status Dropdown Counts - Research

**Researched:** 2026-02-04
**Domain:** Angular 19 component enhancement with Bootstrap 5 dropdowns and dynamic count display
**Confidence:** HIGH

## Summary

This phase adds file counts to status dropdown options in an existing Angular 19 + Bootstrap 5 application. The research focused on three key technical domains: (1) Bootstrap 5 dropdown disabled states and styling, (2) JavaScript/TypeScript number formatting with thousands separators, and (3) Angular component patterns for computing and displaying derived counts from observable collections.

The standard approach is straightforward: compute counts by filtering the files observable, format numbers using the built-in `Intl.NumberFormat` API (not Angular pipes, as this is pure display logic in TypeScript), and use Bootstrap 5's `.disabled` class with `aria-disabled="true"` for zero-count statuses. The existing component already subscribes to the files observable and computes enabled states using `isStatusEnabled()`, so the pattern extends naturally to count computation.

The user decided on "counts refresh when dropdown is opened (not real-time)" which means counts calculate on-demand rather than continuously updating. This is more performant and simpler than real-time updates, avoiding unnecessary computation cycles.

**Primary recommendation:** Compute counts in component properties updated via the existing files subscription, format with `Intl.NumberFormat` in a display method, and show counts in both dropdown button and items using string interpolation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.3 | Dropdown UI component | Already in use, provides `.disabled` class, dropdown events |
| Intl.NumberFormat | Native | Number formatting with locale-aware thousands separators | Built into JavaScript, zero dependencies, handles all locales |
| Immutable.js | 4.3.0 | Immutable collections for files list | Already in use for ViewFile collections |
| RxJS | 7.5.0 | Observable pattern for file updates | Already in use for reactive state management |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @angular/common | 19.2.18 | Provides formatNumber() function | Alternative to Intl.NumberFormat if Angular-specific features needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Intl.NumberFormat | Angular formatNumber() | formatNumber() requires LOCALE_ID injection and is more verbose; Intl is simpler for this use case |
| Intl.NumberFormat | Manual string manipulation (toLocaleString) | toLocaleString() is less explicit about formatting but works; Intl provides more control |
| On-demand counting | Real-time counting | Real-time requires continuous computation on every file update; on-demand is more efficient |

**Installation:**
No new packages needed - all dependencies already installed.

## Architecture Patterns

### Recommended Component Structure
```
file-options.component.ts
├── Component properties for counts (statusCounts: Map<Status, number>)
├── Subscription to files observable (already exists)
├── Count computation method (computeStatusCounts)
├── Number formatting method (formatCount)
└── HTML uses formatCount() in interpolation

file-options.component.html
├── Dropdown button shows selected status with count
├── Dropdown items show all statuses with counts
└── Zero-count items have .disabled class
```

### Pattern 1: Count Computation from Observable Collections
**What:** Subscribe to the unfiltered files observable and compute counts by filtering/grouping in TypeScript
**When to use:** When you need derived statistics from an observable collection
**Example:**
```typescript
// In component subscription (already exists pattern)
this._viewFileService.files.pipe(takeUntil(this.destroy$)).subscribe(files => {
    this.statusCounts = this.computeStatusCounts(files);
    this._changeDetector.detectChanges();
});

private computeStatusCounts(files: Immutable.List<ViewFile>): Map<ViewFile.Status | null, number> {
    const counts = new Map<ViewFile.Status | null, number>();

    // Count "All" (null key = all files)
    counts.set(null, files.size);

    // Count each status
    for (const status of Object.values(ViewFile.Status)) {
        const count = files.filter(f => f.status === status).size;
        counts.set(status, count);
    }

    return counts;
}
```

### Pattern 2: Number Formatting with Intl.NumberFormat
**What:** Use the native Intl.NumberFormat API for locale-aware thousands separators
**When to use:** When formatting numbers for display in UI (not for model/data)
**Example:**
```typescript
// Create formatter instance (can be component property or local)
private readonly numberFormatter = new Intl.NumberFormat('en-US');

formatCount(status: ViewFile.Status | null): string {
    const count = this.statusCounts.get(status) ?? 0;
    return this.numberFormatter.format(count);
}

// Usage in template:
// "All ({{ formatCount(null) }})"
// "Downloaded ({{ formatCount(ViewFile.Status.DOWNLOADED) }})"
```

### Pattern 3: Bootstrap 5 Disabled State
**What:** Use `.disabled` class with `aria-disabled="true"` for non-selectable items
**When to use:** When dropdown items should be visible but not interactive
**Example:**
```html
<div class="dropdown-item"
     [class.active]="isSelected"
     [class.disabled]="getCount(status) === 0"
     [attr.aria-disabled]="getCount(status) === 0 ? true : null"
     (click)="onFilterByStatus(status)">
    <div class="icon"><img src="assets/icons/downloaded.svg" /></div>
    <span class="text">Downloaded ({{ formatCount(status) }})</span>
</div>
```

### Pattern 4: OnPush Change Detection with Manual Trigger
**What:** Component uses OnPush strategy, manually trigger detection after count updates
**When to use:** Component already uses OnPush (file-options.component.ts does)
**Example:**
```typescript
// Component already has ChangeDetectorRef injected and uses detectChanges()
this._viewFileService.files.pipe(takeUntil(this.destroy$)).subscribe(files => {
    this.statusCounts = this.computeStatusCounts(files);
    this._changeDetector.detectChanges(); // Required for OnPush
});
```

### Anti-Patterns to Avoid
- **Computing counts in template:** Avoid `(files | async).filter(...).length` in template - computes on every change detection cycle, poor performance
- **Using Angular pipes for formatting:** DecimalPipe is overkill for simple thousands separators; Intl.NumberFormat is simpler and doesn't require injection
- **Real-time updates without user decision:** User explicitly chose on-demand updates; don't add complexity for unneeded real-time behavior
- **Not handling zero counts:** Always show "(0)" per user decision; don't hide statuses or show blank

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number formatting with thousands separators | Custom regex/string manipulation with commas | `Intl.NumberFormat` | Handles all locales (German uses periods, Indian uses lakhs), zero dependencies, battle-tested |
| Counting array items by property | Manual loop with counter variables | `Array.filter().length` or `Map` grouping | Array methods are optimized, more readable, less error-prone |
| Locale-specific separators | Hardcoded comma insertion | `Intl.NumberFormat` with locale parameter | Supports 100+ locales, future-proof for internationalization |
| Bootstrap disabled state | Custom CSS classes | `.disabled` class with `aria-disabled` | Standard Bootstrap pattern, accessible by default, consistent styling |

**Key insight:** The Intl API is criminally underused. `Intl.NumberFormat` handles all number formatting edge cases (negative numbers, decimals, locale variations, RTL languages) that custom solutions miss. It's built into every modern browser since ES6.

## Common Pitfalls

### Pitfall 1: Forgetting aria-disabled for Accessibility
**What goes wrong:** Using only `.disabled` class without `aria-disabled="true"` means screen readers don't announce the disabled state
**Why it happens:** Bootstrap examples sometimes show only the class, developers forget ARIA attributes
**How to avoid:** Always pair `[class.disabled]="condition"` with `[attr.aria-disabled]="condition ? true : null"`
**Warning signs:** Accessibility audits fail, screen reader users report confusion about why items don't respond

### Pitfall 2: Computing Counts in Template Expressions
**What goes wrong:** Using `{{ (files | async).filter(f => f.status === 'downloaded').length }}` recomputes on every change detection cycle
**Why it happens:** Looks simple and works initially, but Angular's default change detection runs frequently
**How to avoid:** Always compute derived values in component TypeScript, store in properties, update via subscriptions
**Warning signs:** Performance profiling shows filter() called hundreds of times per second, UI feels sluggish

### Pitfall 3: Intl.NumberFormat Locale Mismatch
**What goes wrong:** Using `Intl.NumberFormat('de-DE')` when user's browser locale is 'en-US' shows unexpected formatting
**Why it happens:** Hardcoding locale instead of using browser default or Angular LOCALE_ID
**How to avoid:** Use `new Intl.NumberFormat()` without locale parameter (uses browser default), or inject Angular's LOCALE_ID if configured
**Warning signs:** User reports showing commas instead of expected periods (or vice versa), formatting doesn't match rest of app

### Pitfall 4: Not Preventing Click on Disabled Items
**What goes wrong:** `.disabled` class provides styling but doesn't prevent click events in Bootstrap dropdowns (unlike buttons)
**Why it happens:** Bootstrap dropdown items with `.disabled` are styled but remain clickable
**How to avoid:** Check count in click handler: `(click)="getCount(status) > 0 ? onFilterByStatus(status) : null"` or add pointer-events CSS
**Warning signs:** Users can click disabled items and trigger state changes, causing confusion or errors

### Pitfall 5: OnPush Change Detection Not Triggered
**What goes wrong:** Counts compute correctly but UI doesn't update because OnPush component doesn't detect changes
**Why it happens:** OnPush only detects input changes, events, and manual triggers; observable updates require manual detection
**How to avoid:** Call `this._changeDetector.detectChanges()` after updating count properties in subscriptions
**Warning signs:** Counts show stale data, only update after user interaction, dropdown shows wrong numbers

## Code Examples

Verified patterns from official sources:

### Bootstrap 5 Disabled Dropdown Item
```html
<!-- Source: https://getbootstrap.com/docs/5.3/components/dropdowns/ -->
<ul class="dropdown-menu">
  <li><a class="dropdown-item" href="#">Regular item</a></li>
  <li><a class="dropdown-item disabled" aria-disabled="true">Disabled item</a></li>
  <li><a class="dropdown-item active" aria-current="true">Active item</a></li>
</ul>
```

### Intl.NumberFormat with Thousands Separator
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat

// Use browser default locale
const formatter = new Intl.NumberFormat();
formatter.format(1234567);  // "1,234,567" in en-US, "1.234.567" in de-DE

// Explicit locale
new Intl.NumberFormat('en-US').format(1234567);  // "1,234,567"
new Intl.NumberFormat('de-DE').format(1234567);  // "1.234.567"
new Intl.NumberFormat('en-IN').format(1234567);  // "12,34,567" (Indian lakh system)
```

### Angular Component Counting Pattern
```typescript
// Pattern used in existing file-options.component.ts
ngOnInit(): void {
    // Subscribe to unfiltered files observable
    this._viewFileService.files.pipe(takeUntil(this.destroy$)).subscribe(files => {
        // Compute derived state (currently: isStatusEnabled flags)
        this.isExtractedStatusEnabled = FileOptionsComponent.isStatusEnabled(
            files, ViewFile.Status.EXTRACTED
        );
        // Trigger change detection for OnPush strategy
        this._changeDetector.detectChanges();
    });
}

private static isStatusEnabled(files: Immutable.List<ViewFile>, status: ViewFile.Status): boolean {
    return files.findIndex(f => f.status === status) >= 0;
}
```

### Map-Based Grouping for Counts
```typescript
// Efficient counting by grouping - O(n) single pass
function computeStatusCounts(files: Immutable.List<ViewFile>): Map<ViewFile.Status | null, number> {
    const counts = new Map<ViewFile.Status | null, number>();

    // Initialize all statuses to 0
    counts.set(null, files.size);  // "All" count
    for (const status of Object.values(ViewFile.Status)) {
        counts.set(status, 0);
    }

    // Single pass to count
    files.forEach(file => {
        const currentCount = counts.get(file.status) ?? 0;
        counts.set(file.status, currentCount + 1);
    });

    return counts;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| DecimalPipe in templates | Intl.NumberFormat in component | ES6 (2015) stable, widely adopted 2020+ | Zero Angular dependencies, better performance, works in any TypeScript context |
| Manual string replacement for thousands separator | Intl.NumberFormat | ES6 (2015) Intl API standardized | Handles all locales automatically, eliminates bugs with edge cases |
| Custom ARIA implementations | Bootstrap 5 built-in accessibility | Bootstrap 5 (2021) | `.disabled` + `aria-disabled` is standard pattern, don't reinvent |
| Real-time reactive counts | On-demand computation | N/A - architectural choice | User chose on-demand for this phase; both patterns valid depending on requirements |
| NgFor with pipes for filtering/counting | Component-side computation with subscriptions | Angular best practices (2016+) | Official Angular guidance: don't use pipes for filtering, compute in component |

**Deprecated/outdated:**
- **Angular DecimalPipe for simple formatting:** Still works but overkill for thousands separators; Intl.NumberFormat is simpler
- **toLocaleString() for formatting:** Works but less explicit; Intl.NumberFormat provides clearer API and more options
- **Bootstrap 4 .dropdown-menu-dark:** Replaced with `data-bs-theme="dark"` in Bootstrap 5.3

## Open Questions

Things that couldn't be fully resolved:

1. **Should "All" count be disabled when zero files exist?**
   - What we know: User decided "All" is never disabled even when total is zero, other statuses are disabled at zero
   - What's unclear: User said "All" never disabled "even when total is zero" - does this mean showing "All (0)" as enabled is intentional?
   - Recommendation: Follow user decision literally - show "All (0)" without .disabled class, allow selection (will show empty list, which is fine)

2. **What locale should Intl.NumberFormat use?**
   - What we know: App doesn't currently configure Angular LOCALE_ID, likely defaults to browser locale
   - What's unclear: Should we hardcode 'en-US' or use browser default?
   - Recommendation: Use browser default `new Intl.NumberFormat()` without locale parameter - respects user's system settings, consistent with no explicit i18n configuration

3. **Should counts include filtered results or always show total?**
   - What we know: User wants counts on status dropdown items, component has nameFilter that can filter files
   - What's unclear: If user filters by name, should status counts show totals or only counts matching the name filter?
   - Recommendation: Show total counts (unfiltered), as user said "how many files are in each status category" not "how many visible files" - matches existing isStatusEnabled pattern which uses unfiltered files

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Dropdowns Official Documentation](https://getbootstrap.com/docs/5.3/components/dropdowns/) - Disabled states, accessibility attributes, dropdown structure
- [MDN: Intl.NumberFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat) - Number formatting API signature and examples
- [Angular formatNumber() API](https://angular.dev/api/common/formatNumber) - Alternative formatting function
- [Bootstrap 5 Dropdowns Events - GeeksForGeeks](https://www.geeksforgeeks.org/bootstrap/bootstrap-5-dropdowns-events/) - Dropdown events (show.bs.dropdown, shown.bs.dropdown, etc.)

### Secondary (MEDIUM confidence)
- [Angular Formatting Numbers with Comma Separators](https://fireflysemantics.medium.com/angular-formatting-numbers-with-comma-separators-every-1000-60964f0a4da6) - Community patterns verified with official Angular docs
- [Angular OnPush Change Detection - Avoid Common Pitfalls](https://blog.angular-university.io/onpush-change-detection-how-it-works/) - OnPush strategy and detectChanges() usage
- [Using Maps in TypeScript for Efficient Element Counting](https://codesignal.com/learn/courses/typescript-map-in-practice-revision-and-application/lessons/using-maps-in-typescript-for-efficient-element-counting) - Map-based counting patterns
- [Angular Signals Overview](https://angular.dev/guide/signals) - Modern Angular reactive patterns (not used in this phase but relevant for future)

### Tertiary (LOW confidence)
- Various WebSearch results on Bootstrap dropdowns, Angular performance, TypeScript counting - used for ecosystem understanding, not as authoritative sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions confirmed from package.json, patterns verified with official docs
- Architecture: HIGH - Existing component already uses subscription + OnPush pattern, extending naturally with count computation
- Pitfalls: HIGH - Bootstrap disabled state pitfall verified with official docs, OnPush pitfall confirmed from existing component code, Intl patterns from MDN

**Research date:** 2026-02-04
**Valid until:** 2026-04-04 (60 days - stable technologies, minor version updates unlikely to break patterns)
