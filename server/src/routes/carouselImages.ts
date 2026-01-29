import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { CarouselImage } from "../models/CarouselImage.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { requireTenant, TenantRequest } from "../middleware/tenant.js";
import { requirePermission } from "../middleware/permissions.js";

const router = Router();

// Configuracion de Multer
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    const uploadPath = path.join(process.cwd(), "storage", "carousel");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "carousel-" + uniqueSuffix + path.extname(file.originalname));
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

const updateImageSchema = z.object({
  title: z.string().optional(),
  order: z.number().optional(),
  isActive: z.boolean().optional(),
});

// GET /carousel-images - Listar imágenes
router.get("/", requireTenant, authenticateToken, async (req: AuthenticatedRequest & TenantRequest, res) => {
  try {
    const images = await CarouselImage.find({ tenantId: req.tenantObjectId }).sort({ order: 1, createdAt: -1 });
    res.json(images);
  } catch (error) {
    console.error("Get carousel images error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /carousel-images - Subir imagen
router.post(
  "/",
  requireTenant,
  authenticateToken,
  // requirePermission("platform:settings"), // Ajustar permiso según necesidad, usando platform:settings por ahora
  upload.single("image"),
  async (req: AuthenticatedRequest & TenantRequest, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const { title, order } = req.body;
      const imageUrl = `/storage/carousel/${req.file.filename}`;

      // Si no se provee orden, ponerlo al final (autoincrement)
      let imageOrder = Number(order);
      if (isNaN(imageOrder)) {
          const lastImage = await CarouselImage.findOne({ tenantId: req.tenantObjectId }).sort({ order: -1 });
          imageOrder = lastImage ? lastImage.order + 1 : 0;
      }

      const newImage = new CarouselImage({
        title,
        imageUrl,
        order: imageOrder,
        tenantId: req.tenantObjectId,
      });

      await newImage.save();
      res.status(201).json(newImage);
    } catch (error) {
      console.error("Upload carousel image error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /carousel-images/:id - Eliminar imagen
router.delete("/:id", requireTenant, authenticateToken, async (req: AuthenticatedRequest & TenantRequest, res) => {
  try {
    const image = await CarouselImage.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantObjectId,
    });

    if (!image) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    // Eliminar archivo físico
    // La URL es /storage/carousel/filename.ext
    // El path físico es process.cwd() + storage/carousel/filename.ext
    try {
      const filename = path.basename(image.imageUrl);
      const filePath = path.join(process.cwd(), "storage", "carousel", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error("Failed to delete local file:", err);
      // No fallamos el request si falla borrar el archivo, pero lo logueamos
    }

    res.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error("Delete carousel image error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /carousel-images/:id - Actualizar imagen
router.patch(
  "/:id",
  requireTenant,
  authenticateToken,
  upload.single("image"),
  async (req: AuthenticatedRequest & TenantRequest, res) => {
    try {
      // 1. Validar datos del body (vienen como strings en form-data si hay archivo, o json si no)
      // Zod parsea strings, pero si son numeros los convierte? FormData todo es string.
      // Vamos a extraer manualmente y validar lo que venga.
      const { title, order, isActive } = req.body;
      const updates: any = {};

      if (title !== undefined) updates.title = title;
      if (order !== undefined) updates.order = Number(order);
      if (isActive !== undefined) {
          // Si viene 'true'/'false' string
          if (isActive === "true") updates.isActive = true;
          if (isActive === "false") updates.isActive = false;
          if (typeof isActive === "boolean") updates.isActive = isActive;
      }

      // 2. Si hay archivo, manejarlo
      if (req.file) {
        updates.imageUrl = `/storage/carousel/${req.file.filename}`;
      }

      // 3. Buscar imagen anterior para borrar archivo si se cambia
      const oldImage = await CarouselImage.findOne({ _id: req.params.id, tenantId: req.tenantObjectId });
      if (!oldImage) {
        res.status(404).json({ error: "Image not found" });
        return;
      }

      // 4. Actualizar DB
      const updatedImage = await CarouselImage.findOneAndUpdate(
        { _id: req.params.id, tenantId: req.tenantObjectId },
        { $set: updates },
        { new: true }
      );

      // 5. Si hubo cambio de imagen, borrar la vieja
      if (req.file && oldImage.imageUrl && oldImage.imageUrl !== updates.imageUrl) {
        try {
          const filename = path.basename(oldImage.imageUrl);
          const filePath = path.join(process.cwd(), "storage", "carousel", filename);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (err) {
            console.error("Failed to delete old image file:", err);
        }
      }

      res.json(updatedImage);
    } catch (error) {
      console.error("Update carousel image error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export { router as carouselImageRoutes };
