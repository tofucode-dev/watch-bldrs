/** Request-scoped actor resolved in middleware; see @docs/architecture/security.md. */
export type Actor = { kind: "anonymous" } | { kind: "authenticated"; userId: string };
