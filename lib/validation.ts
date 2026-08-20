import { z } from "zod";

/**
 * Parses FormData against a zod schema and throws a readable error on
 * failure. Server Actions that throw here surface to the nearest error
 * boundary (or, for actions wired to useActionState, are caught and
 * returned as { error }).
 */
export function parseForm<T extends z.ZodTypeAny>(schema: T, formData: FormData): z.infer<T> {
  const raw = Object.fromEntries(formData.entries());
  const result = schema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    const field = first.path.join(".");
    throw new Error(field ? `${field}: ${first.message}` : first.message);
  }
  return result.data;
}

export function parseValue<T extends z.ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(result.error.issues[0].message);
  }
  return result.data;
}

/** An optional, trimmed string: "" and whitespace-only become undefined. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const requiredText = (min: number, max: number) =>
  z.string().trim().min(min, "This field is required").max(max);

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined));

export const cuid = z.string().min(1).max(64);
export const optionalCuid = cuid.optional().or(z.literal("")).transform((v) => (v ? v : undefined));
