# GeoGuessr Stats Dashboard - System Patterns

This application follows a modern, component-based architecture, leveraging the features of Next.js and React.

## High-Level Architecture:

*   **Component-Based UI:** The user interface is built as a tree of reusable React components, promoting modularity and maintainability. Key components include `StatsDashboard`, `RecentMatchesTable`, `MatchRoundsTable`, `CountryStatsTable`, and `Map`.
*   **API-Driven Data Fetching:** The application fetches all GeoGuessr data from a set of dedicated Next.js API routes (e.g., `/api/duels`, `/api/embeddings`). These endpoints handle the communication with the backend databases.
*   **Hybrid Data Storage:** The application utilizes a dual-database approach. Duel and game metadata are stored in an Upstash KV store for fast key-value access, while vector embeddings for similarity searches are stored and indexed in a MongoDB Atlas database, leveraging its specialized vector search capabilities.
*   **Server-Side Data Processing:** Complex and performance-intensive operations, such as similarity searches on vector embeddings, are handled on the server-side within the API routes. This minimizes the computational load on the client and reduces the amount of data that needs to be transferred.
*   **Client-Side State Management:** The client-side is responsible for fetching data from the APIs and managing the UI state using React hooks (`useState`, `useEffect`, `useMemo`). It performs lighter-weight data transformations and filtering needed to render the components.
*   **State Management:** The application uses React's built-in state management hooks (`useState`, `useMemo`) to manage the application's state. This includes the duel data, UI state (like the active tab and selected items), and filters.

## Key Design Patterns:

*   **Dynamic Imports:** The `Map` component is loaded dynamically using `next/dynamic`. This prevents the large Leaflet library from being included in the initial JavaScript bundle, improving the application's initial load time.
*   **Separation of Concerns:** The application demonstrates a clear separation of concerns. UI components are responsible for rendering the UI, data processing logic is encapsulated in hooks and utility functions, and type definitions are kept in a separate `lib/types.ts` file.
*   **Utility-First CSS:** The use of Tailwind CSS promotes a utility-first approach to styling, which allows for building custom designs without writing custom CSS.
*   **Responsive Layout:** The dashboard uses a flexbox-based layout to create a responsive user interface that adapts to different screen sizes. The use of `flex-grow` and `overflow-y-auto` allows panels and tables to dynamically resize and become scrollable.
