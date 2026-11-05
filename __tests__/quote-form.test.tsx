import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuoteForm } from "@/components/quote-form";
import { ProfileToggle } from "@/components/profile-toggle";
import { harborAdapter } from "@/lib/carriers/harbor";
import { assess } from "@/lib/core/pipeline";
import type { Payload } from "@/lib/core/types";
import type { SubmitResult } from "@/app/actions";
import { MAYA } from "./helpers";

const def = harborAdapter.definition;
const okResult = (fields: Payload): SubmitResult => ({ ok: true, request: { ...def.version, idempotencyKey: "k", fields }, receipt: { quoteRef: "HBR-1", status: "received" }, traceId: "t-1" });
const setup = (onSubmit = vi.fn(async (f: Payload) => okResult(f))) => {
  render(<QuoteForm schema={def.schema} mapping={assess(harborAdapter, MAYA).mapping} onSubmit={onSubmit} />);
  return onSubmit;
};

describe("QuoteForm pre-filling", () => {
  it("pre-fills direct and converted values", () => {
    setup();
    expect(screen.getByLabelText(/Full legal name/)).toHaveValue("Maya Torres");
    expect(screen.getByLabelText(/Birth date/)).toHaveValue("03/12/1994");
    expect(screen.getByLabelText(/Email address/)).toHaveValue("maya@example.com");
    expect(screen.getByLabelText(/State of residence/)).toHaveValue("Oregon");
    expect(screen.getByLabelText(/Postal code/)).toHaveValue("97205");
    expect(screen.getByLabelText(/Contents coverage/)).toHaveValue("50000");
    expect(screen.getByLabelText(/Dog breed/)).toHaveValue("Labrador");
    expect(screen.getByRole("checkbox", { name: "Dog" })).toBeChecked();
  });
  it("highlights exactly the fields that need input", () => {
    setup();
    const flagged = screen.getAllByTestId(/^field-/).filter((e) => e.getAttribute("data-needs-input") === "true").map((e) => e.getAttribute("data-testid"));
    expect(flagged.sort()).toEqual(["field-building_has_sprinklers", "field-claims_last_5_years", "field-phone"]);
  });
  it("hides dog breed when no dog is selected", async () => {
    setup();
    await userEvent.click(screen.getByRole("checkbox", { name: "Dog" }));
    expect(screen.queryByLabelText(/Dog breed/)).not.toBeInTheDocument();
  });
  it("blocks submit with messages, then sends exactly the carrier payload", async () => {
    const onSubmit = setup();
    await userEvent.click(screen.getByRole("button", { name: "Submit Quote Payload" }));
    expect(screen.getByText("Mobile number is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText(/Mobile number/), "5035550100");
    await userEvent.type(screen.getByLabelText(/past 5 years/), "0");
    await userEvent.click(screen.getByRole("button", { name: "Submit Quote Payload" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ applicant_full_name: "Maya Torres", contents_coverage: 50000, pets: ["Dog"], claims_last_5_years: 0, phone: "5035550100" }));
    expect(JSON.parse((await screen.findByTestId("final-payload")).textContent!).fields.residence_state).toBe("Oregon");
  });
  it("shows server-side failures", async () => {
    setup(vi.fn(async () => ({ ok: false, kind: "carrier", messages: ["The carrier took too long to respond."], traceId: "t-9" }) as SubmitResult));
    await userEvent.type(screen.getByLabelText(/Mobile number/), "5035550100");
    await userEvent.type(screen.getByLabelText(/past 5 years/), "0");
    await userEvent.click(screen.getByRole("button", { name: "Submit Quote Payload" }));
    expect(await screen.findByTestId("submit-error")).toHaveTextContent(/took too long/);
  });
  it("rejects under-21 birth dates using the shared rule", async () => {
    setup();
    const dob = screen.getByLabelText(/Birth date/);
    await userEvent.clear(dob);
    await userEvent.type(dob, "01/01/2015");
    await userEvent.tab();
    expect(screen.getByText(/at least 21/)).toBeInTheDocument();
  });
});

describe("profile toggle", () => {
  it("offers both samples and marks the active one", () => {
    render(<ProfileToggle active="b" action={async () => {}} />);
    expect(screen.getByRole("button", { name: /Maya - Eligible/ })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Sam - Ineligible/ })).toHaveAttribute("aria-pressed", "true");
  });
});
