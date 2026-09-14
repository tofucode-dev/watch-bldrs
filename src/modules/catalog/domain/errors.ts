export class InvalidCatalogCursorError extends Error {
  constructor(message = "Invalid catalog cursor") {
    super(message);
    this.name = "InvalidCatalogCursorError";
  }
}

export class CatalogUnavailableError extends Error {
  constructor(message = "Catalog unavailable") {
    super(message);
    this.name = "CatalogUnavailableError";
  }
}
