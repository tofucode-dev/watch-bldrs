import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { CatalogBuildCard } from "@/modules/catalog/application/catalog-types";
import {
  CATALOG_FIRST_PAGE_HREF,
  CatalogListing,
  type CatalogListingState,
} from "@/modules/catalog/presentation/catalog-listing";

const FIXTURE_IMAGE = "https://example.com/watch.jpg";

const completeCard: CatalogBuildCard = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Deepwater Explorer",
  mainImageUrl: FIXTURE_IMAGE,
  watchStyle: "Diver",
  movement: "NH35",
  dialColour: "Black",
  strapType: "Steel Bracelet",
  caseSizeMm: 40,
  likeCount: 0,
};

const sparseCard: CatalogBuildCard = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: null,
  mainImageUrl: null,
  watchStyle: null,
  movement: null,
  dialColour: null,
  strapType: null,
  caseSizeMm: null,
  likeCount: 0,
};

afterEach(() => {
  cleanup();
});

describe("CatalogListing", () => {
  it("renders success state in supplied order without card links", () => {
    const state: CatalogListingState = {
      status: "success",
      items: [completeCard, sparseCard],
      previousUrl: null,
      nextUrl: "/builds?after=cursor-2",
    };

    render(<CatalogListing state={state} />);

    const grid = screen.getByRole("list");
    const items = within(grid).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole("heading", { name: "Deepwater Explorer" })).toBeInTheDocument();
    expect(within(items[1]).getByRole("heading", { name: "Untitled build" })).toBeInTheDocument();
    expect(screen.queryAllByRole("link", { name: /Deepwater Explorer|Untitled build/i })).toHaveLength(0);
    expect(within(items[0]).getByText("0 likes")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Deepwater Explorer" })).toHaveAttribute("loading", "eager");
    expect(screen.queryByRole("img", { name: "Untitled build" })).not.toBeInTheDocument();
  });

  it("renders sparse card fallbacks and zero-like copy", () => {
    render(
      <CatalogListing
        state={{
          status: "success",
          items: [sparseCard],
          previousUrl: null,
          nextUrl: null,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Untitled build" })).toBeInTheDocument();
    expect(screen.getByText("0 likes")).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders Previous and Next pagination links when provided", () => {
    render(
      <CatalogListing
        state={{
          status: "success",
          items: [completeCard],
          previousUrl: "/builds?before=cursor-1",
          nextUrl: "/builds?after=cursor-2",
        }}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Catalog pages" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/builds?before=cursor-1");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/builds?after=cursor-2");
  });

  it("omits pagination when no cursors exist", () => {
    render(
      <CatalogListing
        state={{
          status: "success",
          items: [completeCard],
          previousUrl: null,
          nextUrl: null,
        }}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Catalog pages" })).not.toBeInTheDocument();
  });

  it("renders the legitimate empty catalog state", () => {
    render(<CatalogListing state={{ status: "empty" }} />);

    expect(screen.getByRole("heading", { name: "Builds" })).toBeInTheDocument();
    expect(screen.getByText("No published builds yet. Check back soon.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders paginated-empty recovery without claiming the catalog is globally empty", () => {
    render(<CatalogListing state={{ status: "paginated-empty" }} />);

    expect(screen.getByText(/This page is empty/i)).toBeInTheDocument();
    expect(screen.queryByText("No published builds yet. Check back soon.")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to first page" })).toHaveAttribute("href", CATALOG_FIRST_PAGE_HREF);
  });

  it("renders paginated-empty recovery with active filters", () => {
    render(<CatalogListing state={{ status: "paginated-empty", firstPageUrl: "/builds?movement=nh35" }} />);

    expect(screen.getByRole("link", { name: "Back to first page" })).toHaveAttribute("href", "/builds?movement=nh35");
  });

  it("renders filtered-empty copy with a clear-filters link", () => {
    render(<CatalogListing state={{ status: "filtered-empty", clearFiltersUrl: "/builds" }} />);

    expect(screen.getByText("No published builds match the selected filters.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/builds");
  });

  it("renders invalid-cursor recovery copy and link", () => {
    render(<CatalogListing state={{ status: "invalid-cursor" }} />);

    expect(screen.getByText("That page link is invalid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to first page" })).toHaveAttribute("href", CATALOG_FIRST_PAGE_HREF);
  });

  it("renders invalid-filter recovery copy and link", () => {
    render(<CatalogListing state={{ status: "invalid-filter" }} />);

    expect(screen.getByText("Those filters are invalid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", CATALOG_FIRST_PAGE_HREF);
  });

  it("renders unavailable copy with a retry link and no infrastructure details", () => {
    render(<CatalogListing state={{ status: "unavailable" }} />);

    expect(screen.getByText("The catalog is temporarily unavailable. Please try again.")).toBeInTheDocument();
    expect(screen.queryByText(/supabase|postgres|error code/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retry" })).toHaveAttribute("href", CATALOG_FIRST_PAGE_HREF);
  });
});
