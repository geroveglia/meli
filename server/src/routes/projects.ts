import { Router } from "express";
import { z } from "zod";
import { Project } from "../models/Project.js";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth.js";
import { requireTenant, TenantRequest } from "../middleware/tenant.js";
import { requirePermission } from "../middleware/permissions.js";
import { toObjectIdOrNull } from "../utils/mongoIds.js";

const router = Router();

// Zod schemas for validation
const createProjectSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  status: z.enum(["active", "completed", "on_hold"]).optional(),
  startDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : undefined),
});

const updateProjectSchema = createProjectSchema.partial().omit({ clientId: true });

// GET /projects - List projects (optionally filtered by clientId)
router.get("/", requireTenant, authenticateToken, requirePermission("clients:view"), async (req: AuthenticatedRequest & TenantRequest, res) => {
  try {
    const { clientId, status } = req.query;
    const tenantId = toObjectIdOrNull(req.tenantObjectId);

    if (!tenantId) {
      res.status(400).json({ error: "Invalid tenant ID" });
      return;
    }

    const filter: any = { tenantId };

    // Often we want projects specific to a client context
    if (clientId) {
      const clientObjectId = toObjectIdOrNull(clientId as string);
      if (clientObjectId) {
        filter.clientId = clientObjectId;
      }
    }

    if (status) {
      filter.status = status;
    }

    const projects = await Project.find(filter).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error("Get projects error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /projects - Create a new project
router.post("/", requireTenant, authenticateToken, requirePermission("clients:view"), async (req: AuthenticatedRequest & TenantRequest, res) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const tenantId = toObjectIdOrNull(req.tenantObjectId);
    const clientId = toObjectIdOrNull(data.clientId);

    if (!tenantId || !clientId) {
      res.status(400).json({ error: "Invalid ID(s)" });
      return;
    }

    // Check for duplicate name for this client
    const existing = await Project.findOne({
      tenantId,
      clientId,
      name: data.name,
    });

    if (existing) {
      res.status(409).json({ error: "Ya existe un proyecto con este nombre para el cliente seleccionado" });
      return;
    }

    const project = new Project({
      ...data,
      tenantId,
      clientId,
    });

    await project.save();
    res.status(201).json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Datos inválidos", details: error.errors });
      return;
    }
    console.error("Create project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /projects/:id - Update project
router.patch("/:id", requireTenant, authenticateToken, requirePermission("clients:view"), async (req: AuthenticatedRequest & TenantRequest, res) => {
  try {
    const projectId = toObjectIdOrNull(req.params.id);
    if (!projectId) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const data = updateProjectSchema.parse(req.body);
    const tenantId = req.tenantObjectId;

    // TODO: Ideally check if name is being updated to avoid duplicates, similar to POST

    const project = await Project.findOneAndUpdate(
      { _id: projectId, tenantId },
      data,
      { new: true }
    );

    if (!project) {
      res.status(404).json({ error: "Proyecto no encontrado" });
      return;
    }

    res.json(project);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Datos inválidos", details: error.errors });
      return;
    }
    console.error("Update project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /projects/:id - Delete project
router.delete("/:id", requireTenant, authenticateToken, requirePermission("clients:view"), async (req: AuthenticatedRequest & TenantRequest, res) => {
  try {
    const projectId = toObjectIdOrNull(req.params.id);
    if (!projectId) {
      res.status(400).json({ error: "Invalid project ID" });
      return;
    }

    const result = await Project.findOneAndDelete({
      _id: projectId,
      tenantId: req.tenantObjectId,
    });

    if (!result) {
      res.status(404).json({ error: "Proyecto no encontrado" });
      return;
    }

    res.json({ message: "Proyecto eliminado correctamente" });
  } catch (error) {
    console.error("Delete project error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export { router as projectRoutes };
