import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Screen } from "../../Screen";
import { FrameworkScreen } from "@/lib/screen";

const noop = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  noop.mockClear();
});

function renderScreen(
  components: FrameworkScreen["components"],
  context = {},
  onNext = noop
) {
  return render(
    <Screen
      screen={{ slug: "test", components }}
      isLoading={false}
      onNext={onNext}
      context={context}
    />
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("rendering", () => {
  it("renders an input with its label", () => {
    renderScreen([
      { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Your name" } },
    ]);
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
  });

  it("renders a checkbox group with all options", () => {
    renderScreen([
      {
        componentFamily: "response",
        template: "multiple-check",
        props: {
          dataKey: "hobbies",
          label: "Hobbies",
          options: [
            { label: "Reading", value: "reading" },
            { label: "Cooking", value: "cooking" },
          ],
        },
      },
    ]);
    expect(screen.getByLabelText("Reading")).toBeInTheDocument();
    expect(screen.getByLabelText("Cooking")).toBeInTheDocument();
  });

  it("renders a rating with the correct number of options", () => {
    renderScreen([
      { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Score", max: 5 } },
    ]);
    expect(screen.getAllByRole("radio")).toHaveLength(5);
  });

  it("renders rich-text markdown as HTML", () => {
    renderScreen([
      { componentFamily: "content", template: "rich-text", props: { content: "## Hello world" } },
    ]);
    expect(screen.getByRole("heading", { level: 2, name: "Hello world" })).toBeInTheDocument();
  });

  it("renders a button", () => {
    renderScreen([
      { componentFamily: "layout", template: "button", props: { text: "Submit" } },
    ]);
    expect(screen.getByRole("button", { name: "Submit" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Label interpolation
// ---------------------------------------------------------------------------

describe("label interpolation", () => {
  it("replaces @value in labels with currentItem.value from context", () => {
    renderScreen(
      [{ componentFamily: "response", template: "rating", props: { dataKey: "enjoyment", label: "How much do you enjoy @value?", max: 5 } }],
      { currentItem: { value: "soccer", index: 0, loopId: "loop-1" } }
    );
    expect(screen.getByText("How much do you enjoy soccer?")).toBeInTheDocument();
  });

  it("replaces $$ references in labels with context.data values", () => {
    renderScreen(
      [{ componentFamily: "response", template: "text-input", props: { dataKey: "note", label: "Hi $$welcome.name!" } }],
      { data: { welcome: { name: "Juan" } } }
    );
    expect(screen.getByLabelText("Hi Juan!")).toBeInTheDocument();
  });

  it("replaces @value in rich-text content", () => {
    renderScreen(
      [{ componentFamily: "content", template: "rich-text", props: { content: "## @value" } }],
      { currentItem: { value: "cooking", index: 1, loopId: "loop-1" } }
    );
    expect(screen.getByRole("heading", { level: 2, name: "cooking" })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

describe("validation", () => {
  it("blocks submit and shows error when a required input is empty", async () => {
    const onNext = vi.fn().mockResolvedValue(undefined);
    renderScreen(
      [
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ],
      {},
      onNext
    );

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText("This field is required")).toBeInTheDocument();
    expect(screen.getByText(/please fill in all required fields/i)).toBeInTheDocument();
  });

  it("blocks submit and shows error when a required checkbox-group has nothing selected", async () => {
    const onNext = vi.fn().mockResolvedValue(undefined);
    renderScreen(
      [
        {
          componentFamily: "response",
          template: "multiple-check",
          props: {
            dataKey: "activities",
            label: "Activities",
            required: true,
            options: [{ label: "Exercise", value: "exercise" }],
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ],
      {},
      onNext
    );

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText("Please select at least one option")).toBeInTheDocument();
  });

  it("blocks submit and shows error when a required rating is not selected", async () => {
    const onNext = vi.fn().mockResolvedValue(undefined);
    renderScreen(
      [
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Score", max: 5, required: true } },
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ],
      {},
      onNext
    );

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onNext).not.toHaveBeenCalled();
    expect(screen.getByText("Please select a rating")).toBeInTheDocument();
  });

  it("does not block submit for optional fields left empty", async () => {
    const onNext = vi.fn().mockResolvedValue(undefined);
    renderScreen(
      [
        { componentFamily: "response", template: "text-input", props: { dataKey: "note", label: "Optional note" } },
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ],
      {},
      onNext
    );

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onNext).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

describe("data collection", () => {
  it("calls onNext with input value", async () => {
    const onNext = vi.fn().mockResolvedValue(undefined);
    renderScreen(
      [
        { componentFamily: "response", template: "text-input", props: { dataKey: "name", label: "Name", required: true } },
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ],
      {},
      onNext
    );

    await userEvent.type(screen.getByLabelText("Name"), "Juan");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onNext).toHaveBeenCalledWith({ name: "Juan" });
  });

  it("calls onNext with selected checkbox values as array", async () => {
    const onNext = vi.fn().mockResolvedValue(undefined);
    renderScreen(
      [
        {
          componentFamily: "response",
          template: "multiple-check",
          props: {
            dataKey: "activities",
            label: "Activities",
            required: true,
            options: [
              { label: "Reading", value: "reading" },
              { label: "Cooking", value: "cooking" },
            ],
          },
        },
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ],
      {},
      onNext
    );

    await userEvent.click(screen.getByLabelText("Reading"));
    await userEvent.click(screen.getByLabelText("Cooking"));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onNext).toHaveBeenCalledWith({ activities: ["reading", "cooking"] });
  });

  it("calls onNext with selected rating value", async () => {
    const onNext = vi.fn().mockResolvedValue(undefined);
    renderScreen(
      [
        { componentFamily: "response", template: "rating", props: { dataKey: "score", label: "Score", max: 5, required: true } },
        { componentFamily: "layout", template: "button", props: { text: "Submit" } },
      ],
      {},
      onNext
    );

    await userEvent.click(screen.getByDisplayValue("3"));
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    expect(onNext).toHaveBeenCalledWith({ score: "3" });
  });
});
