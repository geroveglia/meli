import axios from "./axiosConfig";

/* ---------- Types ---------- */

export type ClienteStatus = "active" | "inactive" | "lead";

export interface Cliente {
  _id: string;
  tenantId: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status: ClienteStatus;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
  _generatedPassword?: string;
}

export interface ClientesListResponse {
  clientes: Cliente[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateClienteData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status?: ClienteStatus;
  isFavorite?: boolean;
  createUser?: boolean;
  password?: string;
}

export interface UpdateClienteData {
  name?: string;
  company?: string | null;
  email?: string;
  phone?: string | null;
  address?: string | null;
  status?: ClienteStatus;
  isFavorite?: boolean;
}

export interface ClienteListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ClienteStatus;
  isFavorite?: string;
}

function normalizeCliente(raw: unknown): Cliente {
  const data = raw as Record<string, unknown>;

  return {
    _id: String(data?._id ?? ""),
    tenantId: String(data?.tenantId ?? ""),
    name: String(data?.name ?? ""),
    company: data?.company ? String(data.company) : undefined,
    email: String(data?.email ?? ""),
    phone: data?.phone ? String(data.phone) : undefined,
    address: data?.address ? String(data.address) : undefined,
    status: (data?.status as ClienteStatus) ?? "active",
    isFavorite: Boolean(data?.isFavorite ?? false),
    createdAt: String(data?.createdAt ?? ""),
    updatedAt: String(data?.updatedAt ?? ""),
    _generatedPassword: data?._generatedPassword ? String(data._generatedPassword) : undefined,
  };
}

/* ---------- API Class ---------- */

class ClientesAPI {
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

  async count(): Promise<number> {
    const { data } = await axios.get("/clientes/count", {
      headers: this.getHeaders(),
    });
    return data?.count ?? 0;
  }

  async list(params: ClienteListParams = {}): Promise<ClientesListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.status) searchParams.append("status", params.status);
    if (params.isFavorite !== undefined) searchParams.append("isFavorite", params.isFavorite);

    const { data } = await axios.get(`/clientes?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    });

    const rows: unknown[] = Array.isArray(data?.clientes) ? data.clientes : Array.isArray(data) ? data : [];
    const clientes = rows.map(normalizeCliente);

    const pagination = data?.pagination ?? {
      page: Number(params.page ?? 1),
      limit: Number(params.limit ?? clientes.length),
      total: Number(data?.total ?? clientes.length),
      pages: Number(data?.pages ?? 1),
    };

    return { clientes, pagination };
  }

  async get(id: string): Promise<Cliente> {
    const { data } = await axios.get(`/clientes/${id}`, {
      headers: this.getHeaders(),
    });
    return normalizeCliente(data);
  }

  async create(clienteData: CreateClienteData): Promise<Cliente> {
    const { data } = await axios.post("/clientes", clienteData, {
      headers: this.getHeaders(),
    });
    return normalizeCliente(data);
  }

  async update(id: string, clienteData: UpdateClienteData): Promise<Cliente> {
    const { data } = await axios.put(`/clientes/${id}`, clienteData, {
      headers: this.getHeaders(),
    });
    return normalizeCliente(data);
  }

  async toggleFavorite(id: string): Promise<{ isFavorite: boolean }> {
      const { data } = await axios.patch(`/clientes/${id}/favorite`, {}, {
          headers: this.getHeaders(),
      });
      return data;
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    await axios.patch(
      `/clientes/${id}/reset-password`,
      { newPassword },
      { headers: this.getHeaders() }
    );
  }

  async remove(id: string): Promise<void> {
    await axios.delete(`/clientes/${id}`, {
      headers: this.getHeaders(),
    });
  }
}

export const clientesAPI = new ClientesAPI();
