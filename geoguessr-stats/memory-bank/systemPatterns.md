# System Patterns

## System Architecture

The application follows a component-based architecture built on Next.js with the App Router.

-   **Pages and Layouts:** The `app/` directory defines the application's routes and structure.
    -   `app/layout.tsx`: The root layout that wraps all pages.
    -   `app/page.tsx`: The main page of the application, which composes the main UI elements.
-   **Data Fetching:** Data is currently loaded from a static JSON file (`public/geoguessr_stats.json`). The data fetching logic is likely located within the page or a server component.
-   **Component Structure:**
    -   **High-Level Components:** Found in the `app/` directory, these components are specific to certain pages or features (e.g., `StatsDashboard`, `MatchRoundsTable`).
    -   **Reusable Components:** Found in the `components/` directory.
        -   `components/Map.tsx`: A specialized component for the map visualization.
        -   `components/ui/`: A collection of generic, reusable UI components (e.g., `Button`, `Card`, `Table`, `Tabs`) that are used to build the application's interface. This promotes consistency and reusability.

## Key Technical Decisions

-   **Server Components:** The use of Next.js App Router suggests that the application leverages React Server Components for performance and data fetching.
-   **Utility-First CSS:** The project uses Tailwind CSS, indicating a preference for utility-first styling over traditional CSS-in-JS or component-specific stylesheets.
-   **Shadcn/ui Pattern:** The structure of `components/ui` and the use of `tailwind-merge` and `clsx` strongly suggest the use of the `shadcn/ui` pattern for building the component library. This involves copying component code into the project for full control and customization, rather than installing them as a library.
