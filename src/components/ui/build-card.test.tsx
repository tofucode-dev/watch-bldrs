import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { BuildCard, UNTITLED_BUILD } from "@/components/ui/build-card";

const DETAILS_HREF = "/builds/test-build";
const FIXTURE_IMAGE = "https://example.com/watch.jpg";

afterEach(() => {
  cleanup();
});

describe("BuildCard", () => {
  it("renders no anchors when href is omitted", () => {
    render(
      <BuildCard name="Deepwater Explorer" imageUrl={FIXTURE_IMAGE} imageWidth={400} imageHeight={300} likeCount={3} />,
    );

    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.getByRole("heading", { name: "Deepwater Explorer" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Deepwater Explorer" })).toBeInTheDocument();
  });

  it("renders exactly one named content link when href is provided", () => {
    render(
      <BuildCard
        href={DETAILS_HREF}
        name="Deepwater Explorer"
        imageUrl={FIXTURE_IMAGE}
        imageWidth={400}
        imageHeight={300}
        likeCount={3}
      />,
    );

    const link = screen.getByRole("link", { name: "Deepwater Explorer" });
    expect(link).toHaveAttribute("href", DETAILS_HREF);
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(link).toContainElement(screen.getByRole("presentation"));
    expect(link).toContainElement(screen.getByRole("heading", { name: "Deepwater Explorer" }));
  });

  it("exposes the heading accessible name from the build name", () => {
    render(<BuildCard href={DETAILS_HREF} name="Field chronograph" imageUrl={FIXTURE_IMAGE} likeCount={1} />);

    expect(screen.getByRole("heading", { name: "Field chronograph" })).toBeInTheDocument();
  });

  it("uses caller-provided image alt when supplied", () => {
    render(
      <BuildCard
        href={DETAILS_HREF}
        name="Deepwater Explorer"
        imageUrl={FIXTURE_IMAGE}
        imageAlt="Front view of the build"
        likeCount={1}
      />,
    );

    expect(screen.getByRole("presentation")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Deepwater Explorer" })).toBeInTheDocument();
  });

  it("names a linked untitled card from the heading without an unnamed image link", () => {
    render(<BuildCard href={DETAILS_HREF} name={null} imageUrl={FIXTURE_IMAGE} likeCount={0} />);

    expect(screen.getByRole("presentation")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: UNTITLED_BUILD })).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders an unlinked untitled card without anchors", () => {
    render(<BuildCard name={null} imageUrl={FIXTURE_IMAGE} likeCount={0} />);

    expect(screen.getByRole("heading", { name: UNTITLED_BUILD })).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders Untitled build when the name is absent", () => {
    render(<BuildCard href={DETAILS_HREF} name={null} likeCount={0} />);

    expect(screen.getByRole("heading", { name: UNTITLED_BUILD })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: UNTITLED_BUILD })).toBeInTheDocument();
  });

  it("renders a missing-image placeholder inside the stable media frame", () => {
    const { container } = render(<BuildCard href={DETAILS_HREF} name="No photo build" imageUrl={null} likeCount={0} />);

    const placeholder = container.querySelector("[data-slot='build-card-image-placeholder']");
    expect(placeholder).toBeTruthy();
    expect(placeholder).toHaveClass("aspect-[4/3]");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("omits null metadata tags and renders supplied metadata and like count", () => {
    render(
      <BuildCard
        href={DETAILS_HREF}
        name="Tagged build"
        imageUrl={FIXTURE_IMAGE}
        movement="NH35"
        caseSizeMm={40}
        strapType={null}
        dialColour={null}
        likeCount={7}
      />,
    );

    expect(screen.getByText("NH35")).toBeInTheDocument();
    expect(screen.getByText("40mm")).toBeInTheDocument();
    expect(screen.queryByText("Steel bracelet")).not.toBeInTheDocument();
    expect(screen.getByText("7 likes")).toBeInTheDocument();
  });

  it("keeps footer actions outside the details link and allows separate interaction", async () => {
    const user = userEvent.setup();
    let clicked = false;

    render(
      <BuildCard
        href={DETAILS_HREF}
        name="Action build"
        imageUrl={FIXTURE_IMAGE}
        likeCount={2}
        footerAction={
          <button
            type="button"
            onClick={() => {
              clicked = true;
            }}
          >
            Like
          </button>
        }
      />,
    );

    const detailLink = screen.getByRole("link", { name: "Action build" });
    const actionButton = screen.getByRole("button", { name: "Like" });

    expect(detailLink).not.toContainElement(actionButton);
    expect(actionButton).not.toContainElement(detailLink);

    await user.click(actionButton);
    expect(clicked).toBe(true);
  });

  it("does not nest interactive elements inside other interactive elements", () => {
    render(
      <BuildCard
        href={DETAILS_HREF}
        name="Nested check"
        imageUrl={FIXTURE_IMAGE}
        likeCount={1}
        footerAction={<button type="button">Save</button>}
      />,
    );

    const link = screen.getByRole("link", { name: "Nested check" });
    expect(link.querySelector("button")).toBeNull();
  });

  it("merges custom classes onto the card root", () => {
    const { container } = render(
      <BuildCard href={DETAILS_HREF} name="Styled build" likeCount={0} className="custom-build-card" />,
    );

    expect(container.querySelector("[data-slot='build-card']")).toHaveClass("custom-build-card");
  });

  it("defaults image loading to lazy and allows a caller override", () => {
    const { container, rerender } = render(
      <BuildCard href={DETAILS_HREF} name="Lazy build" imageUrl={FIXTURE_IMAGE} likeCount={0} />,
    );

    expect(container.querySelector("img")).toHaveAttribute("loading", "lazy");

    rerender(
      <BuildCard href={DETAILS_HREF} name="Eager build" imageUrl={FIXTURE_IMAGE} imageLoading="eager" likeCount={0} />,
    );

    expect(container.querySelector("img")).toHaveAttribute("loading", "eager");
  });

  it("exposes descriptive image alt text only when the card is not linked", () => {
    render(<BuildCard name="Lazy build" imageUrl={FIXTURE_IMAGE} likeCount={0} />);

    expect(screen.getByRole("img", { name: "Lazy build" })).toHaveAttribute("loading", "lazy");
  });
});
