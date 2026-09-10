import { z } from "zod";
import {
  ACCESSORY_OPTIONS,
  CONDITION_ITEMS,
  CONDITION_VALUES,
  DEVICE_TYPES,
  JOB_PRIORITIES,
  JOB_STATUSES,
  PHOTO_ANGLES,
  QUICK_ISSUES,
} from "./constants";

const mobileRegex = /^[6-9]\d{9}$/; // Indian 10-digit mobile
export const mobileSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => mobileRegex.test(v), "Enter a valid 10-digit mobile number.");

export const customerInputSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120),
  mobile: mobileSchema,
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v === "" || mobileRegex.test(v), "Enter a valid WhatsApp number.")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  customerType: z.enum(["INDIVIDUAL", "BUSINESS"]).default("INDIVIDUAL"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const deviceInputSchema = z.object({
  deviceType: z.enum(DEVICE_TYPES).default("LAPTOP"),
  brand: z.string().trim().min(1, "Brand is required.").max(60),
  model: z.string().trim().min(1, "Model is required.").max(80),
  serialNumber: z.string().trim().max(80).optional().or(z.literal("")),
  serviceTag: z.string().trim().max(80).optional().or(z.literal("")),
  operatingSystem: z.string().trim().max(60).optional().or(z.literal("")),
  processor: z.string().trim().max(80).optional().or(z.literal("")),
  ram: z.string().trim().max(30).optional().or(z.literal("")),
  storage: z.string().trim().max(30).optional().or(z.literal("")),
  color: z.string().trim().max(30).optional().or(z.literal("")),
  deviceAgeYears: z.coerce.number().min(0).max(30).optional().nullable(),
});

export const conditionChecklistSchema = z.record(z.enum(CONDITION_ITEMS), z.enum(CONDITION_VALUES));

export const newJobSchema = z.object({
  customerId: z.string().min(1).optional(),
  customer: customerInputSchema.optional(),
  deviceId: z.string().min(1).optional(),
  device: deviceInputSchema.optional(),
  priority: z.enum(JOB_PRIORITIES).default("NORMAL"),
  conditionChecklist: conditionChecklistSchema.optional(),
  accessoriesReceived: z.array(z.string()).max(20).default([]),
  quickIssues: z.array(z.enum(QUICK_ISSUES)).max(20).default([]),
  complaintText: z.string().trim().max(2000).optional().or(z.literal("")),
  additionalNotes: z.string().trim().max(2000).optional().or(z.literal("")),
  expectedCompletionDate: z.coerce.date().optional().nullable(),
  assignedTechnicianId: z.string().optional().or(z.literal("")),
  estimatedCost: z.coerce.number().min(0).optional().nullable(),
  previousJobId: z.string().optional().or(z.literal("")),
});

export const statusChangeSchema = z.object({
  status: z.enum(JOB_STATUSES),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export const jobUpdateSchema = z.object({
  priority: z.enum(JOB_PRIORITIES).optional(),
  assignedTechnicianId: z.string().nullable().optional(),
  expectedCompletionDate: z.coerce.date().nullable().optional(),
  complaintText: z.string().trim().max(2000).optional(),
  additionalNotes: z.string().trim().max(2000).optional(),
  estimatedCost: z.coerce.number().min(0).nullable().optional(),
});

export const photoUploadSchema = z.object({
  angle: z.enum(PHOTO_ANGLES),
});

export function validAccessory(value: string) {
  return ACCESSORY_OPTIONS.includes(value as (typeof ACCESSORY_OPTIONS)[number]) || value.length <= 40;
}
