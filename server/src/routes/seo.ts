import { Router, Response } from "express";
import { z } from "zod";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { SeoMetadata } from "../models/SeoMetadata.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Multer Configuration for SEO
// ─────────────────────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadPath = path.join(process.cwd(), "storage", "seo");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "seo-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Not an image! Please upload an image.") as any);
    }
  },
});

// Schema validation - We relax types for multipart/form-data parsing (strings)
// or we preprocess. Let's make a loose schema for parsing, then transform.
const seoUpdateSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  metaTitle: z.string().max(200).optional(),
  metaDescription: z.string().max(500).optional(),
  // ogImageUrl can come from body (string) or be generated from file
  ogImageUrl: z.string().optional().or(z.literal("")),
  // multipart sends booleans as strings "true"/"false"
  noIndex: z.preprocess((val) => val === "true" || val === true, z.boolean().optional()),
});


// GET /seo/:entityType/:entityId
router.get(
  "/:entityType/:entityId",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantObjectId;
      const { entityType, entityId } = req.params;

      if (!tenantId) {
        res.status(400).json({ error: "Tenant ID required" });
        return;
      }

      const seoData = await SeoMetadata.findOne({
        tenantId,
        entityType,
        entityId,
      });

      res.json(seoData || {});
    } catch (error) {
      console.error("Get SEO error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /seo/update (Upsert)
router.post(
  "/update",
  authenticateToken,
  upload.single("ogImage"),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantObjectId;
      if (!tenantId) {
        res.status(400).json({ error: "Tenant ID required" });
        return;
      }

      // If a file was uploaded, use its path
      let fileUrl: string | undefined;
      if (req.file) {
        fileUrl = `/storage/seo/${req.file.filename}`;
      }

      // Validate body
      const data = seoUpdateSchema.parse(req.body);

      // Prepare update object
      const updateData: any = {
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        noIndex: data.noIndex || false,
      };

      // Handle ogImageUrl:
      // 1. If file uploaded, use fileUrl
      // 2. Else if ogImageUrl provided in body (e.g. clearing it or keeping existing?), use that.
      // Logic: If file exists, it overrides. If no file, check body.
      if (fileUrl) {
        updateData.ogImageUrl = fileUrl;
      } else if (data.ogImageUrl !== undefined) {
        // If specific string sent (could be empty to clear), use it
        updateData.ogImageUrl = data.ogImageUrl;
      }

      const updatedSeo = await SeoMetadata.findOneAndUpdate(
        {
          tenantId,
          entityType: data.entityType,
          entityId: data.entityId,
        },
        {
          $set: updateData,
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      res.json(updatedSeo);
    } catch (error) {
      if (error instanceof z.ZodError) {
         res.status(400).json({ error: "Validation error", details: error.errors });
         return;
      }
      console.error("Update SEO error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export const seoRoutes = router;
