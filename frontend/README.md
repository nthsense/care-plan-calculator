# Frontend Service

This directory contains the React frontend for the Care Plan Calculator. It is a modern, single-page application (SPA) built with Vite and TypeScript, providing a dynamic and responsive user interface for interacting with the care plan grid.

---

## Core Responsibilities

- **UI:** Renders the main spreadsheet grid, including headers, rows, and cells.
- **User Interaction:** Allows users to:
  - Add and remove rows and columns.
  - Edit cell values and formulas.
  - Edit column titles.
  - Trigger the evaluation process.
- **State Management:** Manages the client-side state of the grid, including cell data, column definitions, and the number of rows.
- **API Communication:** Communicates with the backend `POST /api/evaluate` endpoint to send the grid data for evaluation and then displays the results (or errors) returned by the backend.

---

## Key Libraries & Concepts

- **Vite:** A next-generation frontend tooling system that provides an extremely fast development server with Hot Module Replacement (HMR) and an optimized build process.
- **React:** The core UI library for building the component-based interface.
- **TypeScript:** Ensures type safety and improves developer experience.
- **Tailwind CSS:** A utility-first CSS framework used for styling the application.
- **Vitest & React Testing Library:** Used for the comprehensive end-to-end test suite. The tests simulate real user interactions (e.g., typing in cells, clicking buttons) and verify that the UI behaves as expected and that the correct data is sent to the backend.

---

## Running Tests

The frontend has a suite of end-to-end tests that cover all the core user stories. To run the tests:

```bash
npm test
```