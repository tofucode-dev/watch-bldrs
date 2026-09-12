import type { Actor } from "@/types";

export function actorFromUser(user: { id: string } | null | undefined): Actor {
  if (!user) {
    return { kind: "anonymous" };
  }
  return { kind: "authenticated", userId: user.id };
}
