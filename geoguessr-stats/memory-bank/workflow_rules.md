# Workflow Rules

## Development and Committing Workflow

As a solo hobby project, the focus is on flexibility and ensuring stability before committing changes.

1.  **Local Development & Testing:**
    *   All changes and new features must be thoroughly tested locally using the development server (`npm run dev`).
    *   Verify the changes in a browser to ensure they work as expected and do not introduce any regressions.

2.  **Commit Source Code:**
    *   Once the changes are verified locally, commit the *source code* with a clear and descriptive commit message.
    *   Commits should represent a complete, logical unit of work (e.g., a bug fix or a new feature).

3.  **Push to Remote:**
    *   After committing, push the changes to the remote repository to back them up and keep the history up-to-date.

## Coding Conventions

*   **TypeScript:** Use TypeScript for all new code.
*   **ESLint:** Adhere to the ESLint rules defined in the project configuration.
*   **Component Naming:** Use PascalCase for component names (e.g., `MyComponent`).
*   **File Naming:** Use kebab-case for file names (e.g., `my-component.tsx`).
*   **Comments:** Write clear and concise comments to explain complex logic.
*   **Type Definitions:** Define clear and accurate types for all data structures.
