# DVC Point Charts Data

This directory contains versioned DVC point chart data as JSON files.

## File Naming Convention

Files are named `{resort_slug}_{year}.json` where:
- `resort_slug` matches a slug from `data/resorts.json` (e.g., `polynesian`, `riviera`)
- `year` is the calendar year the chart applies to (e.g., `2026`)

Examples: `polynesian_2026.json`, `riviera_2026.json`

## How to Add a New Chart

1. Copy an existing chart file (e.g., `polynesian_2026.json`)
2. Rename it to `{resort_slug}_{year}.json`
3. Update the `resort` and `year` fields in the JSON
4. Update season date ranges for the target year
5. Update room keys to match the resort's room types and view categories
6. Enter point values from the official chart
7. Validate that every day of the year is covered by exactly one season (no gaps, no overlaps)

## Room Key Format

Room keys use the format `{room_type}_{view_category}`:
- `deluxe_studio_standard` - Deluxe Studio with Standard view
- `one_bedroom_lake` - One Bedroom with Lake view
- `bungalow_theme_park` - Bungalow with Theme Park view
- `tower_studio_preferred` - Tower Studio with Preferred view (Riviera-specific)

Room types and view categories vary by resort. Check `data/resorts.json` for each resort's available types.

## Date Range Rules

- Every day of the calendar year must be covered by exactly one season
- No gaps between seasons (every date must belong to a season)
- No overlaps (a date cannot belong to multiple seasons)
- A season can have multiple non-contiguous date ranges (e.g., Adventure may cover both January and September)

## Where to Find Official Point Chart Data

- [DVC Official Website](https://disneyvacationclub.disney.go.com/)
- [DVCFan.com](https://dvcfan.com/) - Community resource with point charts
- [WDWInfo.com](https://www.wdwinfo.com/) - Walt Disney World information site

## Schema

See `schema.json` for the JSON Schema that validates chart files.
