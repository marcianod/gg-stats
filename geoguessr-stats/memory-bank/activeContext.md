# Active Context

## Current Work Focus

-   **Task:** Implement a dynamic query builder for filtering stats.
-   **Status:** Planning phase. The feature has been defined and is ready for implementation.

## Recent Changes

-   Refactored all tables to use a generic `SortableTable` component, ensuring consistent styling and behavior.
-   Corrected layout issues to ensure all panels are dynamically sized and scrollable.

## Next Steps

-   **Implement the Query Builder UI:**
    -   Create an "+ Add Filter" button.
    -   Develop a dropdown or similar mechanism for selecting data fields (e.g., "Map," "Opponent MMR," "Win/Loss," "Country").
    -   Implement a way to define conditions (e.g., "is," "is not," "is greater than").
    -   Provide an input for the filter value.
-   **Develop the Filtering Logic:**
    -   Implement the logic to apply the selected filters to the dataset.
    -   Allow for chaining multiple filters with AND/OR conditions.
-   **Update the Dashboard:**
    -   Integrate the query builder into the main dashboard view.
    -   Ensure the tables and map update dynamically based on the active filters.

## Important Patterns and Preferences

-   **Shadcn/ui:** The project uses the `shadcn/ui` pattern for its component library. This means new UI components should be added using the `shadcn/ui` CLI or by following its pattern of creating self-contained, customizable components.
-   **Data Source:** The application currently uses a static JSON file for data. Future work may involve replacing this with a live data source.
