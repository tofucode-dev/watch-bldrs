import { BuildCard } from "@/components/ui/build-card";
import { BuildGrid } from "@/components/ui/build-grid";
import { Button } from "@/components/ui/button";
import type { OwnedBuildCard, OwnedBuildsListingState } from "@/modules/builds/application/owned-build-types";

export const DASHBOARD_FIRST_PAGE_HREF = "/dashboard";

export interface OwnedBuildsListingProps {
  state: OwnedBuildsListingState;
}

function OwnedBuildsPagination({ previousUrl, nextUrl }: { previousUrl: string | null; nextUrl: string | null }) {
  if (!previousUrl && !nextUrl) {
    return null;
  }

  return (
    <nav
      data-slot="owned-builds-pagination"
      aria-label="My builds pages"
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
      href={DASHBOARD_FIRST_PAGE_HREF}
      className="font-heading bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex px-4 py-2 text-xs font-bold tracking-widest uppercase"
    >
      {children}
    </a>
  );
}

function statusLabelFor(status: OwnedBuildCard["status"]): "Draft" | "Published" {
  return status === "draft" ? "Draft" : "Published";
}

function buildFooterAction(item: OwnedBuildCard) {
  const editHref = `/dashboard/builds/edit/${item.id}`;

  if (item.status === "draft") {
    return (
      <Button asChild variant="outline" size="sm">
        <a href={editHref}>Edit</a>
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline" size="sm">
        <a href={editHref}>Edit</a>
      </Button>
      <Button asChild variant="outline" size="sm">
        <a href={`/builds/${item.id}`}>View</a>
      </Button>
    </div>
  );
}

export function OwnedBuildsListing({ state }: OwnedBuildsListingProps) {
  if (state.status === "empty") {
    return (
      <section data-slot="owned-builds-empty" className="py-8 text-center">
        <p className="text-muted-foreground text-base">You have not created any builds yet.</p>
        <p className="text-muted-foreground mt-2 text-sm">Start a new build to see it here.</p>
      </section>
    );
  }

  if (state.status === "paginated-empty") {
    return (
      <section data-slot="owned-builds-paginated-empty" className="py-8 text-center">
        <p className="text-muted-foreground text-base">
          This page is empty. Your builds may have moved or been removed.
        </p>
        <RecoveryLink>Back to first page</RecoveryLink>
      </section>
    );
  }

  if (state.status === "invalid-cursor") {
    return (
      <section data-slot="owned-builds-invalid-cursor" className="py-8 text-center">
        <p className="text-muted-foreground text-base">That page link is invalid.</p>
        <RecoveryLink>Back to first page</RecoveryLink>
      </section>
    );
  }

  if (state.status === "unavailable") {
    return (
      <section data-slot="owned-builds-unavailable" className="py-8 text-center">
        <p className="text-muted-foreground text-base">Your builds are temporarily unavailable. Please try again.</p>
        <a
          href={DASHBOARD_FIRST_PAGE_HREF}
          className="font-heading bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex px-4 py-2 text-xs font-bold tracking-widest uppercase"
        >
          Retry
        </a>
      </section>
    );
  }

  if (state.status === "unauthenticated") {
    return null;
  }

  return (
    <section data-slot="owned-builds-success">
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
            likeCount={0}
            showLikeCount={false}
            statusLabel={statusLabelFor(item.status)}
            footerAction={buildFooterAction(item)}
          />
        ))}
      </BuildGrid>

      <OwnedBuildsPagination previousUrl={state.previousUrl} nextUrl={state.nextUrl} />
    </section>
  );
}
