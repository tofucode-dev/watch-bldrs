import { BuildCard } from "@/components/ui/build-card";
import { BuildGrid } from "@/components/ui/build-grid";
import type { CatalogBuildCard } from "@/modules/catalog/application/catalog-types";

export const CATALOG_FIRST_PAGE_HREF = "/builds";

export type CatalogListingState =
  | {
      status: "success";
      items: CatalogBuildCard[];
      previousUrl: string | null;
      nextUrl: string | null;
    }
  | { status: "empty" }
  | { status: "paginated-empty" }
  | { status: "invalid-cursor" }
  | { status: "unavailable" };

export interface CatalogListingProps {
  state: CatalogListingState;
}

function CatalogPagination({
  previousUrl,
  nextUrl,
}: {
  previousUrl: string | null;
  nextUrl: string | null;
}) {
  if (!previousUrl && !nextUrl) {
    return null;
  }

  return (
    <nav
      data-slot="catalog-pagination"
      aria-label="Catalog pages"
      className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
    >
      {previousUrl ? (
        <a
          href={previousUrl}
          className="font-heading border-border bg-card hover:bg-muted border px-4 py-2 text-xs font-bold tracking-widest uppercase"
        >
          Previous
        </a>
      ) : (
        <span />
      )}
      {nextUrl ? (
        <a
          href={nextUrl}
          className="font-heading border-border bg-card hover:bg-muted border px-4 py-2 text-xs font-bold tracking-widest uppercase"
        >
          Next
        </a>
      ) : null}
    </nav>
  );
}

function RecoveryLink({ children }: { children: string }) {
  return (
    <a
      href={CATALOG_FIRST_PAGE_HREF}
      className="font-heading bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex px-4 py-2 text-xs font-bold tracking-widest uppercase"
    >
      {children}
    </a>
  );
}

export function CatalogListing({ state }: CatalogListingProps) {
  if (state.status === "empty") {
    return (
      <section data-slot="catalog-empty" className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight uppercase">Builds</h1>
        <p className="text-muted-foreground mt-4 text-base">No published builds yet. Check back soon.</p>
      </section>
    );
  }

  if (state.status === "paginated-empty") {
    return (
      <section data-slot="catalog-paginated-empty" className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight uppercase">Builds</h1>
        <p className="text-muted-foreground mt-4 text-base">
          This page is empty. The builds here may have moved or are no longer published.
        </p>
        <RecoveryLink>Back to first page</RecoveryLink>
      </section>
    );
  }

  if (state.status === "invalid-cursor") {
    return (
      <section data-slot="catalog-invalid-cursor" className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight uppercase">Builds</h1>
        <p className="text-muted-foreground mt-4 text-base">That page link is invalid.</p>
        <RecoveryLink>Back to first page</RecoveryLink>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section data-slot="catalog-unavailable" className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight uppercase">Builds</h1>
        <p className="text-muted-foreground mt-4 text-base">The catalog is temporarily unavailable. Please try again.</p>
        <a
          href={CATALOG_FIRST_PAGE_HREF}
          className="font-heading bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex px-4 py-2 text-xs font-bold tracking-widest uppercase"
        >
          Retry
        </a>
      </section>
    );
  }

  return (
    <section data-slot="catalog-success" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight uppercase">Builds</h1>
        <p className="text-muted-foreground mt-2 text-sm">Published custom watch builds from the community.</p>
      </header>

      <BuildGrid>
        {state.items.map((item, index) => (
          <BuildCard
            key={item.id}
            name={item.name}
            imageUrl={item.mainImageUrl}
            imageWidth={400}
            imageHeight={300}
            imageLoading={index === 0 ? "eager" : "lazy"}
            styleLabel={item.watchStyle}
            movement={item.movement}
            dialColour={item.dialColour}
            strapType={item.strapType}
            caseSizeMm={item.caseSizeMm}
            likeCount={item.likeCount}
          />
        ))}
      </BuildGrid>

      <CatalogPagination previousUrl={state.previousUrl} nextUrl={state.nextUrl} />
    </section>
  );
}
