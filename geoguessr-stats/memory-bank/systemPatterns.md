# GeoGuessr Stats Dashboard - System Patterns

This application follows a modern, component-based architecture, leveraging the features of Next.js and React.

## High-Level Architecture:

*   **Component-Based UI:** The user interface is built as a tree of reusable React components, promoting modularity and maintainability. Key components include `StatsDashboard`, `RecentMatchesTable`, `MatchRoundsTable`, `CountryStatsTable`, and `Map`.
*   **Client-Side Data Fetching:** The application fetches the GeoGuessr statistics data (`geoguessr_stats.json` and `countries.geojson`) on the client-side using the `useEffect` hook. This approach is suitable for data that can be loaded after the initial page render.
*   **In-Memory Data Processing:** Once the data is fetched, it is processed and transformed in memory using the `useMemo` hook. This optimizes performance by memoizing the results of expensive calculations and preventing unnecessary re-renders.
*   **State Management:** The application uses React's built-in state management hooks (`useState`, `useMemo`) to manage the application's state. This includes the duel data, UI state (like the active tab and selected items), and filters.

## Key Design Patterns:

*   **Dynamic Imports:** The `Map` component is loaded dynamically using `next/dynamic`. This prevents the large Leaflet library from being included in the initial JavaScript bundle, improving the application's initial load time.
*   **Separation of Concerns:** The application demonstrates a clear separation of concerns. UI components are responsible for rendering the UI, data processing logic is encapsulated in hooks and utility functions, and type definitions are kept in a separate `lib/types.ts` file.
*   **Utility-First CSS:** The use of Tailwind CSS promotes a utility-first approach to styling, which allows for building custom designs without writing custom CSS.
*   **Responsive Layout:** The dashboard uses a flexbox-based layout to create a responsive user interface that adapts to different screen sizes. The use of `flex-grow` and `overflow-y-auto` allows panels and tables to dynamically resize and become scrollable.
