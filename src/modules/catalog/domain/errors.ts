export class InvalidCatalogCursorError extends Error {
  constructor(message = "Invalid catalog cursor") {
    super(message);
    this.name = "InvalidCatalogCursorError";
  }
}

export class InvalidCatalogFilterError extends Error {
  constructor(message = "Invalid catalog filter") {
    super(message);
    this.name = "InvalidCatalogFilterError";
  }
}

export class CatalogUnavailableError extends Error {
  constructor(message = "Catalog unavailable") {
    super(message);
    this.name = "CatalogUnavailableError";
  }
}
