# Technical Context

## Technologies Used

-   **Framework:** Next.js (v15.5.3) with Turbopack
-   **Language:** TypeScript (v5)
-   **UI Library:** React (v19.1.0)
-   **Styling:** Tailwind CSS (v4) with `tailwind-merge` and `clsx` for utility class management.
-   **UI Components:** Radix UI for unstyled, accessible components (Tabs), with custom components in `components/ui`. `lucide-react` for icons.
-   **Mapping:** Leaflet (v1.9.4) and `react-leaflet` (v5.0.0) for interactive maps. GeoJSON for map data.
-   **Linting:** ESLint (v9) with Next.js configuration.

## Development Setup

-   **Package Manager:** npm is used (indicated by `package-lock.json`).
-   **Scripts:**
    -   `npm run dev`: Starts the development server with Turbopack.
    -   `npm run build`: Builds the application for production.
    -   `npm run start`: Starts the production server.
    -   `npm run lint`: Lints the codebase.

## Technical Constraints

-   The application currently relies on a local `geoguessr_stats.json` file for data. There is no direct API integration with GeoGuessr at this time.
-   The mapping solution is client-side, which may have performance implications with very large datasets.
