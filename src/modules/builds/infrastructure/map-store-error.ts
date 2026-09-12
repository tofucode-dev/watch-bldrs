import { DraftNotFoundError, DraftValidationError, UnauthenticatedError, UnexpectedStoreError } from "../domain/errors";

interface SupabaseLikeError {
  code?: string | null;
  message?: string | null;
}

export function mapStoreError(error: SupabaseLikeError | null | undefined): never {
  const code = error?.code ?? "";

  if (code === "P0002") {
    throw new DraftNotFoundError();
  }

  if (code === "42501" || code === "PGRST301") {
    throw new UnauthenticatedError();
  }

  if (code === "23514" || code === "23502" || code === "22P02" || code === "22023") {
    throw new DraftValidationError({ form: "Invalid draft" });
  }

  throw new UnexpectedStoreError();
}
