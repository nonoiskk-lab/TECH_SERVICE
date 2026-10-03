// Central source of truth for every "enum-like" string used across the app.
// SQLite has no native enum support in Prisma, so these are validated in the
// application layer (Zod schemas + the guards below) instead of the database.

export const ROLES = [
  "ADMIN",
  "SERVICE_MANAGER",
  "TECHNICIAN",
  "FRONT_DESK",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  SERVICE_MANAGER: "Service Manager",
  TECHNICIAN: "Technician",
  FRONT_DESK: "Front Desk",
};

// ---------------------------------------------------------------------------
// Service job status engine
// ---------------------------------------------------------------------------

// Simplified 4-stage repair pipeline: Received -> Repair In Progress ->
// Delivered -> Completed. Diagnosis/Estimate/Approval/Parts are still real
// features (their own tabs, their own data) — they just no longer drive a
// separate job status; only these 4 stages do.
export const JOB_STATUSES = ["RECEIVED", "REPAIR_IN_PROGRESS", "DELIVERED", "CLOSED"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

// The order, used to render progress bars / stepper UIs.
export const JOB_STATUS_FLOW: JobStatus[] = ["RECEIVED", "REPAIR_IN_PROGRESS", "DELIVERED", "CLOSED"];

// No exception/terminal-side statuses in the simplified pipeline.
export const JOB_STATUS_EXCEPTIONS: JobStatus[] = [];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  RECEIVED: "Received",
  REPAIR_IN_PROGRESS: "Repair In Progress",
  DELIVERED: "Delivered",
  CLOSED: "Completed",
};

// Customer-facing labels are friendlier / hide internal jargon.
export const JOB_STATUS_CUSTOMER_LABELS: Record<JobStatus, string> = {
  RECEIVED: "Device Received",
  REPAIR_IN_PROGRESS: "Repair In Progress",
  DELIVERED: "Delivered",
  CLOSED: "Completed",
};

type StatusTone = "neutral" | "info" | "warning" | "success" | "danger" | "progress";

export const JOB_STATUS_TONE: Record<JobStatus, StatusTone> = {
  RECEIVED: "info",
  REPAIR_IN_PROGRESS: "progress",
  DELIVERED: "success",
  CLOSED: "success",
};

// Which statuses a job may move to from its current status — a straight
// line through the 4 stages, each one final once reached in order.
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  RECEIVED: ["REPAIR_IN_PROGRESS"],
  REPAIR_IN_PROGRESS: ["DELIVERED"],
  DELIVERED: ["CLOSED"],
  CLOSED: [],
};

export const JOB_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

// ---------------------------------------------------------------------------
// Devices & intake
// ---------------------------------------------------------------------------

export const DEVICE_TYPES = ["LAPTOP", "DESKTOP", "ALL_IN_ONE", "OTHER"] as const;

export const CONDITION_ITEMS = [
  "screen",
  "keyboard",
  "touchpad",
  "body",
  "hinges",
  "charger",
  "battery",
  "ports",
  "camera",
  "speakers",
  "wifi",
  "bluetooth",
] as const;
export type ConditionItem = (typeof CONDITION_ITEMS)[number];

export const CONDITION_ITEM_LABELS: Record<ConditionItem, string> = {
  screen: "Screen",
  keyboard: "Keyboard",
  touchpad: "Touchpad",
  body: "Body",
  hinges: "Hinges",
  charger: "Charger",
  battery: "Battery",
  ports: "Ports",
  camera: "Camera",
  speakers: "Speakers",
  wifi: "Wi-Fi",
  bluetooth: "Bluetooth",
};

export const CONDITION_VALUES = ["GOOD", "FAIR", "DAMAGED", "NOT_CHECKED"] as const;
export type ConditionValue = (typeof CONDITION_VALUES)[number];

export const ACCESSORY_OPTIONS = [
  "Charger",
  "Bag",
  "Mouse",
  "Adapter",
  "HDD",
  "Pen Drive",
  "Other",
] as const;

export const QUICK_ISSUES = [
  "Not Powering On",
  "No Display",
  "Slow Performance",
  "Heating",
  "Battery Problem",
  "Keyboard Problem",
  "Screen Problem",
  "Charging Problem",
  "Windows Problem",
  "Software Problem",
  "Virus/Malware",
  "SSD/HDD Problem",
  "RAM Problem",
  "Motherboard Problem",
  "Data Recovery",
  "Other",
] as const;

export const PHOTO_ANGLES = [
  "FRONT",
  "BACK",
  "LEFT",
  "RIGHT",
  "SCREEN",
  "DAMAGE",
  "ACCESSORIES",
  "OTHER",
] as const;

// ---------------------------------------------------------------------------
// Estimates
// ---------------------------------------------------------------------------

export const ESTIMATE_STATUSES = [
  "DRAFT",
  "SENT",
  "APPROVED",
  "REJECTED",
  "NEED_MORE_TIME",
] as const;
export type EstimateStatus = (typeof ESTIMATE_STATUSES)[number];

export const ESTIMATE_ITEM_TYPES = ["PART", "LABOUR", "SERVICE"] as const;

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export const PART_CATEGORIES = [
  "RAM",
  "SSD",
  "HDD",
  "KEYBOARD",
  "DISPLAY",
  "BATTERY",
  "CHARGER",
  "ADAPTER",
  "FAN",
  "THERMAL_PASTE",
  "IC",
  "MOTHERBOARD_PART",
  "CABLE",
  "CONNECTOR",
  "SOFTWARE",
  "ACCESSORY",
  "OTHER",
] as const;
export type PartCategory = (typeof PART_CATEGORIES)[number];

export const MOVEMENT_TYPES = ["PURCHASE", "SERVICE_USE", "RETURN", "DAMAGED", "ADJUSTMENT"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const PO_STATUSES = ["ORDERED", "RECEIVED", "CANCELLED"] as const;
export const PAYMENT_STATUSES_PO = ["UNPAID", "PARTIAL", "PAID"] as const;
export const SUPPLIER_AVAILABILITY = ["AVAILABLE", "OUT_OF_STOCK", "ON_ORDER"] as const;

// Distributor purchase-bill upload: kept well under Vercel's serverless
// request body limit (4.5MB) even after base64 inflates the payload ~33%.
export const MAX_BILL_FILE_BYTES = 3 * 1024 * 1024;
export const ALLOWED_BILL_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;

export const STOCK_LEVEL = ["NORMAL", "LOW", "OUT_OF_STOCK", "CRITICAL"] as const;
export type StockLevel = (typeof STOCK_LEVEL)[number];

export function stockLevelFor(quantity: number, minStock: number): StockLevel {
  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= Math.max(1, Math.floor(minStock / 2))) return "CRITICAL";
  if (quantity <= minStock) return "LOW";
  return "NORMAL";
}

// ---------------------------------------------------------------------------
// Payments & invoicing
// ---------------------------------------------------------------------------

export const PAYMENT_METHODS = ["CASH", "UPI", "CARD", "BANK_TRANSFER", "OTHER"] as const;
export const PAYMENT_TYPES = ["ADVANCE", "PARTIAL", "FINAL"] as const;
export const INVOICE_STATUSES = ["DRAFT", "ISSUED", "PARTIALLY_PAID", "PAID"] as const;

// ---------------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------------

export const WHATSAPP_TEMPLATE_KEYS = [
  "JOB_RECEIVED",
  "DIAGNOSIS_COMPLETE",
  "ESTIMATE_SENT",
  "REPAIR_STARTED",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "PAYMENT_REMINDER",
  "STATUS_LINK",
  "CUSTOM",
] as const;
export type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export const WHATSAPP_TEMPLATE_LABELS: Record<WhatsAppTemplateKey, string> = {
  JOB_RECEIVED: "Job Received",
  DIAGNOSIS_COMPLETE: "Diagnosis Complete",
  ESTIMATE_SENT: "Estimate Sent",
  REPAIR_STARTED: "Repair Started",
  READY_FOR_PICKUP: "Ready for Pickup",
  DELIVERED: "Delivered",
  PAYMENT_REMINDER: "Payment Reminder",
  STATUS_LINK: "Status Check Link",
  CUSTOM: "Custom Message",
};

// Maps a job status change to the WhatsApp template that should fire.
export const STATUS_TO_TEMPLATE: Partial<Record<JobStatus, WhatsAppTemplateKey>> = {
  RECEIVED: "JOB_RECEIVED",
  REPAIR_IN_PROGRESS: "REPAIR_STARTED",
  DELIVERED: "DELIVERED",
};

export const NOTIFICATION_TYPES = [
  "NEW_JOB",
  "APPROVAL_NEEDED",
  "PAYMENT_PENDING",
  "PARTS_REQUIRED",
  "LOW_STOCK",
  "JOB_DELAYED",
  "READY_FOR_DELIVERY",
  "WARRANTY_EXPIRING",
  "SUPPLIER_PURCHASE",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
