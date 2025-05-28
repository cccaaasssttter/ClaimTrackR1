import { z } from "zod";

// User schema for authentication
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  passwordHash: z.string(),
});

export type User = z.infer<typeof userSchema>;
export const insertUserSchema = userSchema.omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;

// Contract schema
export const contractSchema = z.object({
  id: z.string(),
  name: z.string(),
  abn: z.string(),
  clientInfo: z.object({
    name: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
  }),
  contractValue: z.number(),
  gstRate: z.number().default(0.1),
  logoUrl: z.string().optional(),
  templateItems: z.array(z.object({
    id: z.string(),
    description: z.string(),
    contractValue: z.number(),
    percentComplete: z.number().default(0),
    previousClaim: z.number().default(0),
    thisClaim: z.number().default(0),
  })),
  createdAt: z.string(),
});

// Claim schema
export const claimSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  number: z.number(),
  date: z.string(),
  status: z.enum(["Draft", "For Assessment", "Approved", "Invoiced", "Paid"]),
  items: z.array(z.object({
    id: z.string(),
    description: z.string(),
    contractValue: z.number(),
    percentComplete: z.number(),
    previousClaim: z.number(),
    thisClaim: z.number(),
  })),
  totals: z.object({
    exGst: z.number(),
    gst: z.number(),
    incGst: z.number(),
  }),
  attachments: z.array(z.object({
    id: z.string(),
    claimId: z.string(),
    fileName: z.string(),
    mimeType: z.string(),
    blob: z.any(), // Blob type
  })),
  changelog: z.array(z.object({
    timestamp: z.string(),
    fieldChanged: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
  })),
});

// Settings schema
export const settingsSchema = z.object({
  companyName: z.string().default(""),
  companyAbn: z.string().default(""),
  defaultGstRate: z.number().default(0.1),
  logoUrl: z.string().optional(),
  adminPasswordHash: z.string(),
  sessionTimeout: z.number().default(300000), // 5 minutes
});

export type Contract = z.infer<typeof contractSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type LineItem = Contract['templateItems'][0];
export type Attachment = Claim['attachments'][0];
export type ClaimChange = Claim['changelog'][0];
export type Settings = z.infer<typeof settingsSchema>;

export const insertContractSchema = contractSchema.omit({ id: true, createdAt: true });
export const insertClaimSchema = claimSchema.omit({ id: true });
export const insertSettingsSchema = settingsSchema.omit({});

export type InsertContract = z.infer<typeof insertContractSchema>;
export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Drizzle schema for PostgreSQL
import { pgTable, text, integer, real, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contracts = pgTable("contracts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  abn: text("abn"),
  clientInfo: jsonb("client_info").notNull().$type<{
    name: string;
    email?: string;
    phone?: string;
  }>(),
  contractValue: real("contract_value").notNull(),
  gstRate: real("gst_rate").notNull().default(0.1),
  logoUrl: text("logo_url"),
  templateItems: jsonb("template_items").notNull().$type<LineItem[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const claims = pgTable("claims", {
  id: text("id").primaryKey(),
  contractId: text("contract_id").notNull().references(() => contracts.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  date: text("date").notNull(),
  status: text("status").notNull().$type<"Draft" | "For Assessment" | "Approved" | "Invoiced" | "Paid">(),
  items: jsonb("items").notNull().$type<LineItem[]>(),
  totals: jsonb("totals").notNull().$type<{
    exGst: number;
    gst: number;
    incGst: number;
  }>(),
  attachments: jsonb("attachments").notNull().$type<Attachment[]>(),
  changelog: jsonb("changelog").notNull().$type<ClaimChange[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("default"),
  companyName: text("company_name").notNull().default(""),
  companyAbn: text("company_abn").notNull().default(""),
  defaultGstRate: real("default_gst_rate").notNull().default(0.1),
  logoUrl: text("logo_url"),
  adminPasswordHash: text("admin_password_hash").notNull(),
  sessionTimeout: integer("session_timeout").notNull().default(300000),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const contractsRelations = relations(contracts, ({ many }) => ({
  claims: many(claims),
}));

export const claimsRelations = relations(claims, ({ one }) => ({
  contract: one(contracts, {
    fields: [claims.contractId],
    references: [contracts.id],
  }),
}));
