import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { OwnedBuildCard } from "@/modules/builds/application/owned-build-types";
import {
  DASHBOARD_FIRST_PAGE_HREF,
  OwnedBuildsListing,
  type OwnedBuildsListingProps,
} from "@/modules/builds/presentation/owned-builds-listing";

const FIXTURE_IMAGE = "https://example.com/watch.jpg";

const draftCard: OwnedBuildCard = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Weekend Explorer",
  status: "draft",
  mainImageUrl: FIXTURE_IMAGE,
  watchStyle: "Field",
  movement: "NH35",
  dialColour: "Black",
  strapType: "NATO",
  caseSizeMm: 40,
  updatedAt: "2026-09-14T12:00:00.000Z",
};

const publishedCard: OwnedBuildCard = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Deepwater Diver",
  status: "published",
  mainImageUrl: FIXTURE_IMAGE,
  watchStyle: "Diver",
  movement: "NH36",
  dialColour: "Blue",
  strapType: "Steel bracelet",
  caseSizeMm: 41,
  updatedAt: "2026-09-13T12:00:00.000Z",
};

afterEach(() => {
  cleanup();
});

describe("OwnedBuildsListing", () => {
  it("renders draft cards with Edit only and a Draft status label", () => {
    const state: OwnedBuildsListingProps["state"] = {
      status: "success",
      items: [draftCard],
      previousUrl: null,
      nextUrl: null,
    };

    render(<OwnedBuildsListing state={state} />);

    const grid = screen.getByRole("list");
    const item = within(grid).getByRole("listitem");

    expect(within(item).getByText("Draft")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/dashboard/builds/edit/${draftCard.id}`,
    );
    expect(within(item).queryByRole("link", { name: "View" })).not.toBeInTheDocument();
    expect(within(item).queryByText(/likes/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: /Weekend Explorer|Deepwater Diver/i })).toHaveLength(0);
  });

  it("renders published cards with Edit and View links", () => {
    const state: OwnedBuildsListingProps["state"] = {
      status: "success",
      items: [publishedCard],
      previousUrl: null,
      nextUrl: null,
    };

    render(<OwnedBuildsListing state={state} />);

    const grid = screen.getByRole("list");
    const item = within(grid).getByRole("listitem");

    expect(within(item).getByText("Published")).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      `/dashboard/builds/edit/${publishedCard.id}`,
    );
    expect(within(item).getByRole("link", { name: "View" })).toHaveAttribute("href", `/builds/${publishedCard.id}`);
  });

  it("renders Previous and Next pagination links when provided", () => {
    render(
      <OwnedBuildsListing
        state={{
          status: "success",
          items: [draftCard],
          previousUrl: "/dashboard?before=cursor-1",
          nextUrl: "/dashboard?after=cursor-2",
        }}
      />,
    );

    expect(screen.getByRole("navigation", { name: "My builds pages" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/dashboard?before=cursor-1");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/dashboard?after=cursor-2");
  });

  it("omits pagination when no cursors exist", () => {
    render(
      <OwnedBuildsListing
        state={{
          status: "success",
          items: [draftCard],
          previousUrl: null,
          nextUrl: null,
        }}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "My builds pages" })).not.toBeInTheDocument();
  });

  it("renders the empty state", () => {
    render(<OwnedBuildsListing state={{ status: "empty" }} />);

    expect(screen.getByText("You have not created any builds yet.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders paginated-empty recovery without claiming the dashboard is globally empty", () => {
    render(<OwnedBuildsListing state={{ status: "paginated-empty" }} />);

    expect(screen.getByText(/This page is empty/i)).toBeInTheDocument();
    expect(screen.queryByText("You have not created any builds yet.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to first page" })).toHaveAttribute("href", DASHBOARD_FIRST_PAGE_HREF);
  });

  it("renders invalid-cursor recovery copy and link", () => {
    render(<OwnedBuildsListing state={{ status: "invalid-cursor" }} />);

    expect(screen.getByText("That page link is invalid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to first page" })).toHaveAttribute("href", DASHBOARD_FIRST_PAGE_HREF);
  });

  it("renders unavailable copy with a retry link and no infrastructure details", () => {
    render(<OwnedBuildsListing state={{ status: "unavailable" }} />);

    expect(screen.getByText("Your builds are temporarily unavailable. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/supabase|postgres|error code/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retry" })).toHaveAttribute("href", DASHBOARD_FIRST_PAGE_HREF);
  });
});
