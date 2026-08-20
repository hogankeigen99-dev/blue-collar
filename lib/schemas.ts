import { z } from "zod";
import { optionalText, optionalEmail, cuid, optionalCuid } from "@/lib/validation";

export const signUpSchema = z.object({
  orgName: z.string().trim().min(1, "Organization name is required").max(120),
  name: z.string().trim().min(1, "Your name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const logInSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  password: z.string().min(1, "Password is required").max(200),
});

export const createUserSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
  role: z.enum(["OWNER", "ADMIN", "EXECUTIVE", "SALES", "PROJECT_MANAGER", "FIELD_TECH"]),
});

export const requestPasswordResetSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(255),
});

export const setPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Password must be at least 8 characters").max(200),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: optionalText(40),
  email: optionalEmail,
  address: optionalText(300),
  notes: optionalText(2000),
});

export const PROJECT_STATUSES = ["SCHEDULED", "IN_PROGRESS", "ON_HOLD", "COMPLETED", "CANCELLED"] as const;
export const projectStatusSchema = z.enum(PROJECT_STATUSES);

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: optionalText(4000),
  address: optionalText(300),
  customerId: optionalCuid,
  scheduledAt: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const taskStatusSchema = z.enum(["TODO", "IN_PROGRESS", "DONE"]);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  assigneeUserId: optionalCuid,
  dueDate: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? new Date(v) : undefined)),
});

export const addMemberSchema = z.object({
  userId: cuid,
  role: z.enum(["LEAD", "MEMBER"]).default("MEMBER"),
});

export const createScheduleEntrySchema = z
  .object({
    projectId: cuid,
    userId: cuid,
    startAt: z.string().trim().min(1, "Start time is required"),
    endAt: z.string().trim().min(1, "End time is required"),
    notes: optionalText(500),
  })
  .transform((data) => ({
    ...data,
    startAt: new Date(data.startAt),
    endAt: new Date(data.endAt),
  }))
  .refine((data) => data.endAt > data.startAt, {
    message: "End time must be after start time",
    path: ["endAt"],
  });

export const leadStatusSchema = z.enum(["NEW", "CONTACTED", "QUALIFIED", "WON", "LOST"]);

export const createLeadSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  contactName: optionalText(120),
  phone: optionalText(40),
  email: optionalEmail,
  source: optionalText(120),
  notes: optionalText(2000),
});

export const estimateStatusSchema = z.enum(["DRAFT", "SENT", "APPROVED", "REJECTED"]);

export const createEstimateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  customerId: optionalCuid,
  leadId: optionalCuid,
  notes: optionalText(2000),
});

export const addLineItemSchema = z.object({
  description: z.string().trim().min(1, "Description is required").max(300),
  quantity: z.coerce.number().finite().positive().max(100000).default(1),
  unitPrice: z.coerce.number().finite().min(0).max(10_000_000).default(0),
});
