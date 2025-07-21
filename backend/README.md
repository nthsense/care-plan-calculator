# Backend Service

This directory contains the Node.js and Express backend for the Care Plan Calculator. It is responsible for all the core business logic, including parsing and evaluating formulas, managing dependencies, and handling errors.

---

## Core Responsibilities

- **API:** Exposes a single `POST /api/evaluate` endpoint that accepts a JSON representation of the spreadsheet grid.
- **Parsing:** Lexes and parses spreadsheet formulas into a concrete syntax tree.
- **Dependency Management:** Builds a directed acyclic graph (DAG) to represent the dependencies between cells.
- **Evaluation:** Traverses the dependency graph in topological order to correctly evaluate formulas and calculate the final value for each cell.
- **Error Handling:** Detects and reports various errors, including circular references, invalid formulas, and logical errors like division by zero.

---

## The Evaluation Engine

The core of the backend is an evaluation engine designed to safely and correctly calculate the spreadsheet. It operates in three main phases:

### 1. Graph Construction (`graph.ts`)

When a request is received, the first step is to build a dependency graph using the `graphology` library.

- Each cell in the grid is added as a node to the graph.
- For cells containing formulas, the formula is parsed, and any references to other cells are identified.
- A **directed edge** is created from the referenced cell to the formula cell (e.g., for the formula `=A1+B1` in cell `C1`, edges are created from `A1` -> `C1` and `B1` -> `C1`).
- This process allows us to create a map of all dependencies. Crucially, before adding an edge, we check if it would create a **circular reference** (e.g., A1 -> B1 -> A1). If it would, we mark the cell with a `#REF!` error and do not add the edge, keeping the graph acyclic.

### 2. Formula Parsing (`parser/`)

A key challenge is understanding the structure of a formula. While simple formulas could be handled with regular expressions, this approach quickly becomes brittle and cannot handle nested expressions, operator precedence, or complex syntax.

To solve this, we use the **`lezer` parser generator**.

- **Motivation:** A parser generator allows us to define the "grammar" of our formula language in a declarative way (`syntax.grammar`). `lezer` then compiles this grammar into a highly efficient, battle-tested parser. This is a much more robust and maintainable approach than writing a manual parser or using regex. It allows us to easily support operator precedence (e.g., `*` before `+`), parentheses, and a wide range of operators.
- **Process:** The `lezer` parser takes a formula string (e.g., `=((A1*B1)+(C1/2))`) and produces a **Concrete Syntax Tree (CST)**. This tree is a hierarchical representation of the formula that makes it easy to traverse and evaluate.

### 3. Evaluation (`evaluator.ts`)

Once the dependency graph is built, we can evaluate the cells.

- The `forEachNodeInTopologicalOrder` function from `graphology-dag` is used to traverse the graph. This is the key to the entire process: it guarantees that we only evaluate a cell *after* all of its dependencies have been evaluated.
- For each formula cell, we recursively walk its syntax tree.
- As we walk the tree, we build a JavaScript-compatible expression string. For example, the formula `=A1<>B1` is translated to the string `"10 != 5"`.
- This final string is then executed using the `new Function()` constructor, which safely evaluates the expression and returns the result. This is safer than a direct `eval()` call as it does not have access to the outer scope.
- The result of the evaluation is then stored back on the cell's node in the graph.

This three-phase process ensures that even complex, interdependent formulas are evaluated correctly and safely.

---

## Running Tests

To run the backend's integration test suite:

```bash
npm test
```
