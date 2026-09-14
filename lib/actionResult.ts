/**
 * Result type for Server Actions.
 *
 * Next.js redacts any error *thrown* out of a Server Action in a production
 * build, replacing the message with "An error occurred in the Server Components
 * render. The specific message is omitted in production builds to avoid leaking
 * sensitive details." That is why a deliberate, useful message like "Only the
 * workspace owner can delete a board" reaches the user as a generic server
 * error once deployed, even though it reads correctly in `next dev`.
 *
 * The fix is to *return* failures rather than throw them. Actions wrap their
 * body in `runAction`, which distinguishes two cases:
 *
 *   - `ActionError`  — a message deliberately written for the user. Returned
 *                      verbatim, so it survives the production build.
 *   - anything else  — an unexpected fault (a Prisma error, a bug). Logged in
 *                      full server-side with a short reference, while the user
 *                      gets a generic message plus that reference. This keeps
 *                      the safety property Next's redaction was protecting.
 */

export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "UNEXPECTED";

/**
 * "warning" = you did something that isn't allowed, nothing is broken.
 * "error"   = something genuinely went wrong.
 * The board UI tones the message accordingly.
 */
export type ActionSeverity = "warning" | "error";

export type ActionFailure = {
  ok: false;
  error: string;
  code: ActionErrorCode;
  severity: ActionSeverity;
  /** Present only for unexpected faults; matches a line in the server log. */
  ref?: string;
};

export type ActionResult<T = undefined> = { ok: true; data: T } | ActionFailure;

const DEFAULT_SEVERITY: Record<ActionErrorCode, ActionSeverity> = {
  UNAUTHENTICATED: "warning",
  FORBIDDEN: "warning",
  NOT_FOUND: "warning",
  VALIDATION: "warning",
  CONFLICT: "warning",
  UNEXPECTED: "error",
};

/**
 * An error whose message is written for the user and is safe to display.
 */
export class ActionError extends Error {
  readonly code: ActionErrorCode;
  readonly severity: ActionSeverity;

  constructor(message: string, code: ActionErrorCode = "VALIDATION", severity?: ActionSeverity) {
    super(message);
    this.name = "ActionError";
    this.code = code;
    this.severity = severity ?? DEFAULT_SEVERITY[code];
  }
}

/** Shorthands for the cases that come up repeatedly. */
export const unauthenticated = (message = "Your session has ended. Sign in again to continue.") =>
  new ActionError(message, "UNAUTHENTICATED");

export const forbidden = (message: string) => new ActionError(message, "FORBIDDEN");

export const notFound = (message: string) => new ActionError(message, "NOT_FOUND");

export const invalid = (message: string) => new ActionError(message, "VALIDATION");

export const conflict = (message: string) => new ActionError(message, "CONFLICT");

function makeRef() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/**
 * Wraps a Server Action body so failures are returned instead of thrown.
 *
 * `label` names the action in server logs — it is never sent to the client.
 */
export async function runAction<T>(
  label: string,
  fn: () => Promise<T>
): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ActionError) {
      return {
        ok: false,
        error: error.message,
        code: error.code,
        severity: error.severity,
      };
    }

    // Unexpected: the message may contain schema or connection details, so it
    // stays on the server. The ref lets a user quote the failure to support.
    const ref = makeRef();
    console.error(`[action:${label}] unexpected failure ref=${ref}`, error);

    return {
      ok: false,
      error: `Something went wrong on our side and the change was not saved. Reference ${ref}.`,
      code: "UNEXPECTED",
      severity: "error",
      ref,
    };
  }
}
