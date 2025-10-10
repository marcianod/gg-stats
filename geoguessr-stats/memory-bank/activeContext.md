# GeoGuessr Stats Dashboard - Active Context

## Current Focus

The current focus is on implementing a sophisticated date range picker component to allow users to filter match data by a selected time period. This feature is being added to the "Vibe" page first, and will then be integrated into the main dashboard.

## Problem Details

-   **Styling Issues:** The date picker popover is experiencing several visual glitches:
    -   The calendar popover is not correctly aligned and has z-index issues, causing it to be obscured by other elements like the map.
    -   The calendar's day-of-the-week headers ("Su", "Mo", etc.) are misaligned.
    -   The visual distinction between the currently selected date range and today's date is not clear enough.

## Next Steps

-   **Refine Calendar Styling:** Adjust the CSS for the `Calendar` component to fix the header alignment and improve the visual representation of the selected range and today's date.
-   **Ensure Correct Stacking:** Modify the component structure and z-index values to guarantee the date picker popover always appears on top of other UI elements.
-   **Finalize Vibe Page:** Complete the implementation and styling fixes for the "Vibe" page.
-   **Main Dashboard Integration:** Once the component is finalized, remove the old filter UI from the main dashboard and integrate the new `DateRangePicker`.
