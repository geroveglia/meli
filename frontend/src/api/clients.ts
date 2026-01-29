import axios from "./axiosConfig";

/* ---------- Types ---------- */

export type ClientStatus = "active" | "inactive" | "lead";

export interface Client {
  _id: string;
  tenantId: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  avatar?: string;
  status: ClientStatus;
  isFavorite?: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface ClientsListResponse {
  clients: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateClientData {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status?: ClientStatus;

}

export interface UpdateClientData {
  name?: string;
  company?: string | null;
  email?: string;
  phone?: string | null;
  address?: string | null;
  status?: ClientStatus;

}

export interface ClientListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ClientStatus;

}

/* ---------- Normalizer ---------- */

function normalizeClient(raw: unknown): Client {
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
    status: (data?.status as ClientStatus) ?? "active",
    isFavorite: Boolean(data?.isFavorite ?? false),

    createdAt: String(data?.createdAt ?? ""),
    updatedAt: String(data?.updatedAt ?? ""),
  };
}

/* ---------- API Class ---------- */

class ClientsAPI {
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
   * Get clients count for navbar badge
   */
  async count(): Promise<number> {
    const { data } = await axios.get("/clients/count", {
      headers: this.getHeaders(),
    });
    return data?.count ?? 0;
  }

  /**
   * List clients with search, filters and pagination
   */
  async list(params: ClientListParams = {}): Promise<ClientsListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.status) searchParams.append("status", params.status);

    const { data } = await axios.get(`/clients?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    });

    const rows: unknown[] = Array.isArray(data?.clients)
      ? data.clients
      : Array.isArray(data)
      ? data
      : [];

    const clients = rows.map(normalizeClient);

    const pagination = data?.pagination ?? {
      page: Number(params.page ?? 1),
      limit: Number(params.limit ?? clients.length),
      total: Number(data?.total ?? clients.length),
      pages: Number(data?.pages ?? 1),
    };

    return { clients, pagination };
  }

  /**
   * Get a single client by ID
   */
  async get(id: string): Promise<Client> {
    const { data } = await axios.get(`/clients/${id}`, {
      headers: this.getHeaders(),
    });
    return normalizeClient(data);
  }

  /**
   * Create a new client
   */
  async create(clientData: CreateClientData): Promise<Client> {
    const { data } = await axios.post("/clients", clientData, {
      headers: this.getHeaders(),
    });
    return normalizeClient(data);
  }

  /**
   * Update an existing client
   */
  async update(id: string, clientData: UpdateClientData): Promise<Client> {
    const { data } = await axios.put(`/clients/${id}`, clientData, {
      headers: this.getHeaders(),
    });
    return normalizeClient(data);
  }



  /**
   * Delete a client (hard delete)
   */
  async remove(id: string): Promise<void> {
    await axios.delete(`/clients/${id}`, {
      headers: this.getHeaders(),
    });
  }
}

export const clientsAPI = new ClientsAPI();
