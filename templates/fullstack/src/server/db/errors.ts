export interface PgErrorInfo {
  code?: string;
  constraint?: string;
  message: string;
}

export function getPgErrorInfo(err: unknown): PgErrorInfo {
  let current: unknown = err;
  const messages: string[] = [];
  let code: string | undefined;
  let constraint: string | undefined;

  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth += 1) {
    const obj = current as {
      code?: unknown;
      constraint?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (typeof obj.code === "string" && !code) code = obj.code;
    if (typeof obj.constraint === "string" && !constraint) constraint = obj.constraint;
    if (typeof obj.message === "string") messages.push(obj.message);
    current = obj.cause;
  }

  return { code, constraint, message: messages.join(" | ") };
}

export function isUniqueViolation(err: unknown, constraintHint?: string): boolean {
  const info = getPgErrorInfo(err);
  const isUnique =
    info.code === "23505" || /duplicate key|unique constraint/i.test(info.message);
  if (!isUnique) return false;
  if (!constraintHint) return true;
  return info.constraint === constraintHint || info.message.includes(constraintHint);
}
