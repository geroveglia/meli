import { Request, Response, NextFunction } from "express";
import { env } from "../config/env.js";
import { tenantRepository } from "../repository/index.js";
import { Types } from "mongoose"; // Careful with this import if we want to be pure, but kept for type checking if needed or removed. 
// If we want to support both, we should rely on repository to handle ID formats.

export interface TenantRequest extends Request {
  tenantId?: string; // Standard string ID
  tenantObjectId?: any; // Kept for types compatibility, but prefer tenantId
}

export function requireTenant(req: TenantRequest, res: Response, next: NextFunction): void {
  const headerName = (env.TENANCY_HEADER || "X-Tenant-Id").toLowerCase();
  const tenantIdOrSlug = (req.headers[headerName] as string) || (req.headers["x-tenant-id"] as string);

  if (!tenantIdOrSlug) {
    res.status(400).json({ error: "Missing tenantId header" });
    return;
  }

  req.tenantId = tenantIdOrSlug;

  (async () => {
    try {
      let tenant;

      // Try finding by ID first if it looks like one, or Slug. 
      // Mongo IDs are 24 hex chars. MySQL IDs are integers (as strings here).
      // A simple heuristic: if it matches Mongo ObjectId format, try ID. Else try Slug.
      // But actually, 'tenantIdOrSlug' might be a slug like 'demo-tenant'.
      
      // Strategy: Try by Slug first if string, then ID? Or check format.
      // Ideally repository handles "findByIdOrSlug" but we have separate methods.
      
      // Check if it's a valid ObjectId (Mongo)
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(tenantIdOrSlug);
      // Check if it's a number (MySQL ID)
      const isNumericId = /^\d+$/.test(tenantIdOrSlug);

      if (isMongoId || isNumericId) {
          tenant = await tenantRepository.findById(tenantIdOrSlug);
          if (!tenant && !isNumericId) { 
              // Fallback: It might be a slug that looks like an ID? Unlikely for ObjectId.
              tenant = await tenantRepository.findBySlug(tenantIdOrSlug);
          }
      } else {
          tenant = await tenantRepository.findBySlug(tenantIdOrSlug);
      }

      if (!tenant) {
        res.status(404).json({ error: "Tenant not found" });
        return;
      }

      req.tenantId = String(tenant._id || tenant.id);
      // req.tenantObjectId = ... // Deprecated/Mongo specific. 
      // If code downstream needs it, we might need to cast if Mongo.
      if (tenant._id) {
          req.tenantObjectId = tenant._id;
      }
      
      next();
    } catch (error) {
      console.error("Error resolving tenant:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  })();
}

export async function resolveTenant(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
  const tenantIdOrSlug = req.tenantId;

  if (!tenantIdOrSlug) {
    res.status(400).json({ error: "Missing tenantId" });
    return;
  }

  try {
    let tenant;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(tenantIdOrSlug);
    const isNumericId = /^\d+$/.test(tenantIdOrSlug);

    if (isMongoId || isNumericId) {
        tenant = await tenantRepository.findById(tenantIdOrSlug);
    } else {
        tenant = await tenantRepository.findBySlug(tenantIdOrSlug);
    }

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    req.tenantId = String(tenant._id || tenant.id);
    if (tenant._id) {
        req.tenantObjectId = tenant._id;
    }
    next();
  } catch (error) {
    console.error("Error resolving tenant:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
