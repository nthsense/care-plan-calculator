import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { vi } from "vitest";

/**
 * Clicks the "Add Column" button to add a new column to the grid.
 */
async function addColumn() {
  const addColButton = await screen.findByTestId("addColumn");
  await userEvent.click(addColButton);
}

/**
 * Clicks the "Add Row" button to add a new row to the grid.
 */
async function addRow() {
  const addRowButton = await screen.findByTestId("addRow");
  await userEvent.click(addRowButton);
}

/**
 * A basic smoke test to ensure the component renders without crashing.
 */
test("renders main heading", () => {
  render(<App />);
  const headingElement = screen.getByText(/Care Plan Calculator/i);
  expect(headingElement).toBeInTheDocument();
});

/**
 * Tests that a simple formula with two direct cell references is calculated correctly.
 * This test also verifies that the frontend sends the correct payload to the backend,
 * distinguishing between literal values and formulas.
 */
test("basic formula evaluation", async () => {
  const user = userEvent.setup();

  // Mock the fetch function to return a successful evaluation
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          table: {
            data: {
              A1: { value: "10" },
              B1: { value: "20" },
              C1: { value: "30" },
            },
          },
        }),
    }),
  );
  global.fetch = fetchMock as any;

  render(<App />);

  // Add two columns to get to C
  await addColumn();
  await addColumn();

  // Get the input fields for cells A1, B1, and C1
  const cellA1 = screen.getByTestId("A1");
  const cellB1 = screen.getByTestId("B1");
  const cellC1 = screen.getByTestId("C1");

  // Type values into cells A1 and B1, and a formula in C1
  await user.type(cellA1, "10");
  await user.type(cellB1, "20");
  await user.type(cellC1, "=A1+B1");

  // Click the evaluate button
  const evaluateButton = screen.getByRole("button", { name: /evaluate/i });
  await user.click(evaluateButton);

  // --- Verification Step 1: Assert the request payload ---
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const fetchOptions = fetchMock.mock.calls[0][1];
  const body = JSON.parse(fetchOptions.body);

  const expectedPayloadData = {
    A1: { value: "10" },
    B1: { value: "20" },
    C1: { value: "###", formula: "=A1+B1" },
  };
  expect(body.data).toEqual(expectedPayloadData);

  // --- Verification Step 2: Assert the final UI state ---
  await waitFor(() => {
    expect(screen.getByTestId("C1")).toHaveValue("30");
  });
});

/**
 * Tests that formulas can depend on other formulas (A1 -> B1 -> C1) and are resolved correctly.
 */
test("chained formula evaluation", async () => {
  const user = userEvent.setup();

  // Mock the fetch function to return a successful evaluation
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          table: {
            data: {
              A1: { value: "10" },
              B1: { value: "20", formula: "=A1*2" },
              C1: { value: "25", formula: "=B1+5" },
            },
          },
        }),
    }),
  );
  global.fetch = fetchMock as any;

  render(<App />);

  // Add two columns to get to C
  await addColumn();
  await addColumn();

  // Get the input fields for cells A1, B1, and C1
  const cellA1 = screen.getByTestId("A1");
  const cellB1 = screen.getByTestId("B1");
  const cellC1 = screen.getByTestId("C1");

  // Type values and formulas into the cells
  await user.type(cellA1, "10");
  await user.type(cellB1, "=A1*2");
  await user.type(cellC1, "=B1+5");

  // Click the evaluate button
  const evaluateButton = screen.getByRole("button", { name: /evaluate/i });
  await user.click(evaluateButton);

  // --- Verification Step 1: Assert the request payload ---
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const fetchOptions = fetchMock.mock.calls[0][1];
  const body = JSON.parse(fetchOptions.body);

  const expectedPayloadData = {
    A1: { value: "10" },
    B1: { value: "###", formula: "=A1*2" },
    C1: { value: "###", formula: "=B1+5" },
  };
  expect(body.data).toEqual(expectedPayloadData);

  // --- Verification Step 2: Assert the final UI state ---
  await waitFor(() => {
    expect(screen.getByTestId("C1")).toHaveValue("25");
  });
});

/**
 * Tests that a syntactically incorrect formula results in a specific error message.
 */
test("invalid formula error handling", async () => {
  const user = userEvent.setup();

  // Mock the fetch function to return an error for the invalid formula
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          table: {
            data: {
              A1: { value: "10" },
              B1: { value: "20" },
              C1: { error: "#ERROR!" },
            },
          },
        }),
    }),
  );
  global.fetch = fetchMock as any;

  render(<App />);

  // Add two columns to get to C
  await addColumn();
  await addColumn();

  // Get the input fields for the cells
  const cellA1 = screen.getByTestId("A1");
  const cellB1 = screen.getByTestId("B1");
  const cellC1 = screen.getByTestId("C1");

  // Type values and an invalid formula
  await user.type(cellA1, "10");
  await user.type(cellB1, "20");
  await user.type(cellC1, "=A1++B1");

  // Click the evaluate button
  const evaluateButton = screen.getByRole("button", { name: /evaluate/i });
  await user.click(evaluateButton);

  // --- Verification Step 1: Assert the request payload ---
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const fetchOptions = fetchMock.mock.calls[0][1];
  const body = JSON.parse(fetchOptions.body);

  const expectedPayloadData = {
    A1: { value: "10" },
    B1: { value: "20" },
    C1: { value: "###", formula: "=A1++B1" },
  };
  expect(body.data).toEqual(expectedPayloadData);

  // --- Verification Step 2: Assert the final UI state ---
  await waitFor(() => {
    expect(screen.getByTestId("C1")).toHaveValue("#ERROR!");
  });
});

/**
 * Tests that a circular dependency between cells (A1 -> B1 -> A1) is detected
 * and results in a reference error.
 */
test("circular reference error handling", async () => {
  const user = userEvent.setup();

  // Mock the fetch function to return a circular reference error
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          table: {
            data: {
              A1: { error: "#REF!" },
              B1: { error: "#REF!" },
            },
          },
        }),
    }),
  );
  global.fetch = fetchMock as any;

  render(<App />);

  // Add a column to get to B
  await addColumn();

  // Get the input fields for cells A1 and B1
  const cellA1 = screen.getByTestId("A1");
  const cellB1 = screen.getByTestId("B1");

  // Create a circular reference
  await user.type(cellA1, "=B1");
  await user.type(cellB1, "=A1");

  // Click the evaluate button
  const evaluateButton = screen.getByRole("button", { name: /evaluate/i });
  await user.click(evaluateButton);

  // --- Verification Step 1: Assert the request payload ---
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const fetchOptions = fetchMock.mock.calls[0][1];
  const body = JSON.parse(fetchOptions.body);

  const expectedPayloadData = {
    A1: { value: "###", formula: "=B1" },
    B1: { value: "###", formula: "=A1" },
  };
  expect(body.data).toEqual(expectedPayloadData);

  // --- Verification Step 2: Assert the final UI state ---
  await waitFor(() => {
    expect(screen.getByTestId("A1")).toHaveValue("#REF!");
    expect(screen.getByTestId("B1")).toHaveValue("#REF!");
  });
});

/**
 * Tests that the grid can be dynamically updated by adding new rows and columns,
 * and that formulas can reference these new cells.
 */
test("dynamic grid changes", async () => {
  const user = userEvent.setup();

  // Mock the fetch function for the dynamic evaluation
  const fetchMock = vi.fn(() =>
    Promise.resolve({
      json: () =>
        Promise.resolve({
          table: {
            data: {
              A1: { value: "10" },
              A2: { value: "20" },
              B2: { value: "30" },
            },
          },
        }),
    }),
  );
  global.fetch = fetchMock as any;

  render(<App />);

  // Add a column and a row to create a 2x2 grid
  await addColumn();
  await addRow();

  // Get the input fields for the cells
  const cellA1 = screen.getByTestId("A1");
  const cellA2 = screen.getByTestId("A2");
  const cellB2 = screen.getByTestId("B2");

  // Type values into the new cells and a formula in B2
  await user.type(cellA1, "10");
  await user.type(cellA2, "20");
  await user.type(cellB2, "=A1+A2");

  // Click the evaluate button
  const evaluateButton = screen.getByRole("button", { name: /evaluate/i });
  await user.click(evaluateButton);

  // --- Verification Step 1: Assert the request payload ---
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const fetchOptions = fetchMock.mock.calls[0][1];
  const body = JSON.parse(fetchOptions.body);

  const expectedPayloadData = {
    A1: { value: "10" },
    A2: { value: "20" },
    B2: { value: "###", formula: "=A1+A2" },
  };
  expect(body.data).toEqual(expectedPayloadData);

  // --- Verification Step 2: Assert the final UI state ---
  await waitFor(() => {
    expect(screen.getByTestId("B2")).toHaveValue("30");
  });
});
