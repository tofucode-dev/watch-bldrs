/** Request-scoped actor resolved in middleware; see @context/foundation/architecture/security.md. */
export type Actor = { kind: "anonymous" } | { kind: "authenticated"; userId: string };
