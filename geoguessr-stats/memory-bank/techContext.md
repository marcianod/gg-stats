# GeoGuessr Stats Dashboard - Technical Context

This project is a web application built with a modern JavaScript stack. The following is a summary of the key technologies and libraries used:

## Frontend Framework:

*   **Next.js:** A React framework for building server-side rendered and statically generated web applications.
*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.

## Styling:

*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
*   **clsx & tailwind-merge:** Utilities for constructing dynamic and conditional class names.

## UI Components:

*   **Radix UI:** A library of unstyled, accessible UI components.
*   **Lucide React:** A library of beautiful and consistent icons.

## Mapping:

*   **Leaflet:** An open-source JavaScript library for mobile-friendly interactive maps.
*   **React Leaflet:** React components for Leaflet maps.
*   **GeoJSON:** A format for encoding a variety of geographic data structures.

## Database:

*   **MongoDB Atlas:** Used for storing and performing vector similarity searches on round embeddings.
*   **Upstash KV:** A serverless Redis database used for storing duel/game metadata for fast access.

## Development Tools:

*   **ESLint:** A pluggable and configurable linter tool for identifying and reporting on patterns in JavaScript.
*   **Turbopack:** An incremental bundler for JavaScript and TypeScript, written in Rust.
