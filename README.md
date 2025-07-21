# Care Plan Calculator

A full-stack web application designed for therapists and care coordinators to model pediatric therapy care plans. It provides a dynamic, spreadsheet-like interface where each cell can represent a care-related metric (e.g., hours of therapy, projected outcomes, resource needs) and can depend on other cells via formulas.

The application is built with a modern TypeScript stack, featuring a React frontend and a Node.js backend, all containerized with Docker for easy and consistent deployment.

---

## Features

- **Dynamic Grid:** Users can add and remove rows and columns to customize the care plan grid.
- **Formula Support:** Cells can contain literal values or formulas that reference other cells (e.g., `=A1 * 1.2`).
- **Rich Operator Support:** Supports a wide range of operators, including:
  - Basic arithmetic: `+`, `-`, `*`, `/`
  - Exponents: `^`
  - Concatenation: `&`
  - Comparisons: `>`, `<`, `=`, `<>`
  - Percentages: `%`
- **Recursive Dependency Resolution:** The backend builds a dependency graph to correctly evaluate formulas in the proper order.
- **Robust Error Handling:** The system gracefully detects and displays standard spreadsheet errors, including:
  - **`#REF!`** for circular dependencies or invalid cell references.
  - **`#VALUE!`** for operations on invalid data types (e.g., multiplying by text).
  - **`#DIV/0!`** for division-by-zero errors.
- **Comprehensive Test Suite:** Includes end-to-end frontend tests and a full suite of backend integration tests to ensure reliability and correctness.

---

## Tech Stack

- **Frontend:**
  - React with Vite
  - TypeScript
  - Tailwind CSS for styling
  - Vitest & React Testing Library for testing
  - ShadCN for UI Components
  - Codemirror for formula syntax highlighting
- **Backend:**
  - Node.js with Express
  - TypeScript
  - Lezer Parser for formula grammar
  - Graphology for dependency management
  - Vitest & Supertest for integration testing
- **Containerization:**
  - Docker & Docker Compose

---

## Getting Started

### Prerequisites

- Docker and Docker Compose must be installed on your system.

### Running the Application

The application is fully containerized, and all commands should be run from the project root.

**1. Development Mode:**

This mode enables hot-reloading for both the frontend and backend services.

```bash
# Build the images (only needed on first run or after dependency changes)
docker compose build

# Start the services in detached mode
docker compose up -d
```

- The frontend will be available at `http://localhost:3000`.
- The backend API will be available at `http://localhost:3001`.

**2. Production Mode:**

This mode builds and runs the optimized, production-ready versions of the services.

```bash
# Build the production images
docker compose -f docker-compose.prod.yml build

# Start the services
docker compose -f docker-compose.prod.yml up
```

**Switching Between Environments:**

To prevent issues with stale volumes when switching between `dev` and `prod`, it's recommended to fully stop and remove the containers and volumes before rebuilding.

```bash
docker compose down -v
```

---

## Running Tests

The frontend and backend have their own dedicated test suites.

### Backend Tests

To run the backend integration tests, `cd` into the `backend` directory and run:

```bash
cd backend
npm test
```

### Frontend Tests

To run the frontend end-to-end tests, `cd` into the `frontend` directory and run:

```bash
cd frontend
npm test
```

---
## Assumptions
- No support for accessibility is needed at this time
- No need to test security
- No need to support ranges (ex, =A1:D10)
- No localization support necessary
- Performance testing is unnecessary
- Going above and beyond is OK (support for operators beyond the basic arithmetic, support for more than 100 rows)
- "Return a grid of evaluated results" means the values should display in the spreadsheet (like Excel), not as a separate results grid.
- A general-purpose spreadsheet capability will suffice for representing care-related metrics.

## Future Improvements

- [ ] **TODO:** Create a shared `packages/types` workspace to share TypeScript types between the `frontend` and `backend`, preventing code duplication and ensuring type safety across the full stack.
- [ ] **TODO** Support RangeTokens in the evaluator so that functions like SUM(A1:D1) can be implemented.
- [ ] **TODO** Implement a full set of functions
- [ ] **TODO** Implement templates for things like the Vineland-3 Adaptive Behavior Scales
- [ ] **TODO** Support more than 26 columns
- [ ] **TODO** Frontend and Backend should share the same parser build artifact to ensure compatibilty.
- [ ] **TODO** Implement typeahead and syntax hints.
