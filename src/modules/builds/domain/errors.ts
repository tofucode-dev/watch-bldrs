export class UnauthenticatedError extends Error {
  readonly code = "unauthenticated" as const;

  constructor() {
    super("Sign in to continue");
    this.name = "UnauthenticatedError";
  }
}

export class DraftNotFoundError extends Error {
  readonly code = "not_found" as const;

  constructor() {
    super("Draft not found");
    this.name = "DraftNotFoundError";
  }
}

export class DraftValidationError extends Error {
  readonly code = "validation" as const;
  readonly fields: Readonly<Record<string, string>>;

  constructor(fields: Record<string, string>) {
    super("Invalid draft");
    this.name = "DraftValidationError";
    this.fields = fields;
  }
}

export class UnexpectedStoreError extends Error {
  readonly code = "unexpected" as const;

  constructor() {
    super("Something went wrong");
    this.name = "UnexpectedStoreError";
  }
}

export class InvalidOwnedBuildCursorError extends Error {
  constructor(message = "Invalid owned build cursor") {
    super(message);
    this.name = "InvalidOwnedBuildCursorError";
  }
}
