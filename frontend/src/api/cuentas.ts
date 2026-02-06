import axios from "./axiosConfig";

/* ---------- Types ---------- */

export type CuentaStatus = "active" | "inactive" | "lead";

export interface Cuenta {
  _id: string;
  tenantId: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  status: CuentaStatus;
  isFavorite?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface CuentasListResponse {
  cuentas: Cuenta[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateCuentaData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status?: CuentaStatus;

}

export interface UpdateCuentaData {
  name?: string;
  company?: string | null;
  email?: string;
  phone?: string | null;
  address?: string | null;
  status?: CuentaStatus;

}

export interface CuentaListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CuentaStatus;

}

/* ---------- Normalizer ---------- */

function normalizeCuenta(raw: unknown): Cuenta {
  const data = raw as Record<string, unknown>;
  return {
    _id: String(data?._id ?? ""),
    tenantId: String(data?.tenantId ?? ""),
    name: String(data?.name ?? ""),
    company: data?.company ? String(data.company) : undefined,
    email: String(data?.email ?? ""),
    phone: data?.phone ? String(data.phone) : undefined,
    address: data?.address ? String(data.address) : undefined,
    avatar: data?.avatar ? String(data.avatar) : undefined,
    status: (data?.status as CuentaStatus) ?? "active",
    isFavorite: Boolean(data?.isFavorite ?? false),

    createdAt: String(data?.createdAt ?? ""),
    updatedAt: String(data?.updatedAt ?? ""),
  };
}

/* ---------- API Class ---------- */

class CuentasAPI {
  private getHeaders() {
    const token = localStorage.getItem("token");
    const tenantSlug = localStorage.getItem("tenantSlug");
    const tenantId = localStorage.getItem("tenantId");

    return {
      Authorization: `Bearer ${token}`,
      "X-Tenant-Id": tenantSlug || tenantId || "",
      "Content-Type": "application/json",
    };
  }

  /**
   * Get cuentas count for navbar badge
   */
  async count(): Promise<number> {
    const { data } = await axios.get("/cuentas/count", {
      headers: this.getHeaders(),
    });
    return data?.count ?? 0;
  }

  /**
   * List cuentas with search, filters and pagination
   */
  async list(params: CuentaListParams = {}): Promise<CuentasListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.status) searchParams.append("status", params.status);

    const { data } = await axios.get(`/cuentas?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    });

    const rows: unknown[] = Array.isArray(data?.cuentas)
      ? data.cuentas
      : Array.isArray(data)
      ? data
      : [];

    const cuentas = rows.map(normalizeCuenta);

    const pagination = data?.pagination ?? {
      page: Number(params.page ?? 1),
      limit: Number(params.limit ?? cuentas.length),
      total: Number(data?.total ?? cuentas.length),
      pages: Number(data?.pages ?? 1),
    };

    return { cuentas, pagination };
  }

  /**
   * Get a single cuenta by ID
   */
  async get(id: string): Promise<Cuenta> {
    const { data } = await axios.get(`/cuentas/${id}`, {
      headers: this.getHeaders(),
    });
    return normalizeCuenta(data);
  }

  /**
   * Create a new cuenta
   */
  async create(cuentaData: CreateCuentaData): Promise<Cuenta> {
    const { data } = await axios.post("/cuentas", cuentaData, {
      headers: this.getHeaders(),
    });
    return normalizeCuenta(data);
  }

  /**
   * Update an existing cuenta
   */
  async update(id: string, cuentaData: UpdateCuentaData): Promise<Cuenta> {
    const { data } = await axios.put(`/cuentas/${id}`, cuentaData, {
      headers: this.getHeaders(),
    });
    return normalizeCuenta(data);
  }



  /**
   * Delete a cuenta (hard delete)
   */
  async remove(id: string): Promise<void> {
    await axios.delete(`/cuentas/${id}`, {
      headers: this.getHeaders(),
    });
  }
}

export const cuentasAPI = new CuentasAPI();
