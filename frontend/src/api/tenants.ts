import axios from "./axiosConfig";

/* ---------- Types ---------- */

export type SubscriptionPlan = "free" | "basic" | "pro" | "enterprise";
export type SubscriptionStatus = "active" | "suspended" | "cancelled";

export interface TenantAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface TenantCompany {
  legalName: string;
  taxId?: string;
  industry?: string;
  address?: TenantAddress;
  website?: string;
  description?: string;
  logoUrl?: string;
  firmaRRHHUrl?: string;
}

export interface TenantContact {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  position?: string;
  department?: string;
}

export interface TenantSettings {
  timezone: string;
  currency: string;
  language: string;
  features: string[];
}

export interface TenantSubscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  expiresAt?: string;
}

export interface TenantUsage {
  users: { current: number; limit: number };
  clients: { current: number; limit: number };
  campaigns: { current: number; limit: number };
  storage: { usedMB: number; limitMB: number };
  apiCalls: { current: number; limit: number; resetDate: string };
  lastUpdated: string;
}

export interface TenantBilling {
  currentPeriod: {
    startDate: string;
    endDate: string;
    amount: number;
    currency: string;
  };
  paymentMethod?: {
    type: "card" | "bank" | "paypal";
    last4?: string;
    expiryDate?: string;
  };
  invoices: {
    id: string;
    date: string;
    amount: number;
    status: "paid" | "pending" | "overdue" | "cancelled";
    downloadUrl?: string;
  }[];
  nextBillingDate?: string;
  autoRenew: boolean;
}

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  domain?: string;
  userIds: string[];
  isSystem: boolean;
  company: TenantCompany;
  contact: TenantContact;
  settings: TenantSettings;
  subscription: TenantSubscription;
  usage: TenantUsage;
  billing: TenantBilling;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount?: number;
}

export interface TenantsListResponse {
  tenants: Tenant[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateTenantData {
  name: string;
  slug: string;
  domain?: string;
  company: {
    legalName: string;
    taxId?: string;
    industry?: string;
    address?: TenantAddress;
    website?: string;
    description?: string;
    logoUrl?: string;
  };
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    position?: string;
    department?: string;
  };
  settings?: {
    timezone?: string;
    currency?: string;
    language?: string;
    features?: string[];
  };
  subscription?: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
  };
}

export interface UpdateTenantData extends Partial<CreateTenantData> {
  isActive?: boolean;
}

export interface TenantListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
  isActive?: boolean;
}

/* ---------- Normalizer ---------- */

function normalizeTenant(raw: unknown): Tenant {
  const data = raw as Record<string, unknown>;
  return {
    _id: String(data?._id ?? ""),
    name: String(data?.name ?? ""),
    slug: String(data?.slug ?? ""),
    domain: data?.domain ? String(data.domain) : undefined,
    userIds: Array.isArray(data?.userIds) ? data.userIds.map(String) : [],
    isSystem: Boolean(data?.isSystem),
    company: (data?.company as TenantCompany) ?? { legalName: "" },
    contact: (data?.contact as TenantContact) ?? { firstName: "", lastName: "", email: "" },
    settings: (data?.settings as TenantSettings) ?? { timezone: "UTC", currency: "USD", language: "es", features: [] },
    subscription: (data?.subscription as TenantSubscription) ?? { plan: "free", status: "active" },
    usage: (data?.usage as TenantUsage) ?? {
      users: { current: 0, limit: 10 },
      clients: { current: 0, limit: 50 },
      campaigns: { current: 0, limit: 100 },
      storage: { usedMB: 0, limitMB: 1024 },
      apiCalls: { current: 0, limit: 10000, resetDate: new Date().toISOString() },
      lastUpdated: new Date().toISOString(),
    },
    billing: (data?.billing as TenantBilling) ?? {
      currentPeriod: { startDate: "", endDate: "", amount: 0, currency: "ARS" },
      invoices: [],
      autoRenew: true,
    },
    isActive: Boolean(data?.isActive ?? true),
    createdAt: String(data?.createdAt ?? ""),
    updatedAt: String(data?.updatedAt ?? ""),
    userCount: typeof data?.userCount === "number" ? data.userCount : undefined,
  };
}

/* ---------- API Class ---------- */

class TenantsAPI {
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
   * Get tenants count
   */
  async count(): Promise<number> {
    const { data } = await axios.get("/tenants/count", {
      headers: this.getHeaders(),
    });
    return data?.count ?? 0;
  }

  /**
   * List tenants with search, filters and pagination
   */
  async list(params: TenantListParams = {}): Promise<TenantsListResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append("page", params.page.toString());
    if (params.limit) searchParams.append("limit", params.limit.toString());
    if (params.search) searchParams.append("search", params.search);
    if (params.status) searchParams.append("status", params.status);
    if (params.plan) searchParams.append("plan", params.plan);
    if (params.isActive !== undefined) {
      searchParams.append("isActive", params.isActive.toString());
    }

    const { data } = await axios.get(`/tenants?${searchParams.toString()}`, {
      headers: this.getHeaders(),
    });

    const rows: unknown[] = Array.isArray(data?.tenants)
      ? data.tenants
      : Array.isArray(data)
      ? data
      : [];

    const tenants = rows.map(normalizeTenant);

    const pagination = data?.pagination ?? {
      page: Number(params.page ?? 1),
      limit: Number(params.limit ?? tenants.length),
      total: Number(data?.total ?? tenants.length),
      pages: Number(data?.pages ?? 1),
    };

    return { tenants, pagination };
  }

  /**
   * Get a single tenant by ID
   */
  async get(id: string): Promise<Tenant> {
    const { data } = await axios.get(`/tenants/${id}`, {
      headers: this.getHeaders(),
    });
    return normalizeTenant(data);
  }

  /**
   * Create a new tenant
   */
  async create(tenantData: CreateTenantData): Promise<{ tenant: Tenant; _generatedPassword?: string }> {
    const { data } = await axios.post("/tenants", tenantData, {
      headers: this.getHeaders(),
    });
    return {
      tenant: normalizeTenant(data),
      _generatedPassword: data._generatedPassword,
    };
  }

  /**
   * Update an existing tenant
   */
  async update(id: string, tenantData: UpdateTenantData): Promise<Tenant> {
    const { data } = await axios.put(`/tenants/${id}`, tenantData, {
      headers: this.getHeaders(),
    });
    return normalizeTenant(data);
  }

  /**
   * Toggle tenant active status
   */
  async toggleStatus(id: string, isActive: boolean): Promise<{ isActive: boolean }> {
    const { data } = await axios.patch(
      `/tenants/${id}/status`,
      { isActive },
      { headers: this.getHeaders() }
    );
    return { isActive: Boolean(data?.isActive) };
  }

  /**
   * Update tenant subscription
   */
  async updateSubscription(
    id: string,
    subscription: { plan?: SubscriptionPlan; status?: SubscriptionStatus }
  ): Promise<{ subscription: TenantSubscription }> {
    const { data } = await axios.patch(
      `/tenants/${id}/subscription`,
      subscription,
      { headers: this.getHeaders() }
    );
    return { subscription: data?.subscription };
  }

  /**
   * Delete a tenant
   */
  async remove(id: string): Promise<void> {
    await axios.delete(`/tenants/${id}`, {
      headers: this.getHeaders(),
    });
  }
}

export const tenantsAPI = new TenantsAPI();
