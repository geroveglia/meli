import axios from "./axiosConfig";

export interface Project {
  _id: string;
  tenantId: string;
  clientId: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "on_hold";
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  clientId: string;
  name: string;
  description?: string;
  status: "active" | "completed" | "on_hold";
  startDate?: string | null;
  endDate?: string | null;
}

export interface UpdateProjectData extends Partial<Omit<CreateProjectData, "clientId">> {}

export const projectsAPI = {
  list: async (params: { clientId: string; status?: string }) => {
    const { data } = await axios.get<Project[]>("/projects", { params });
    return data;
  },

  create: async (project: CreateProjectData) => {
    const { data } = await axios.post<Project>("/projects", project);
    return data;
  },

  update: async (id: string, project: UpdateProjectData) => {
    const { data } = await axios.patch<Project>(`/projects/${id}`, project);
    return data;
  },

  remove: async (id: string) => {
    const { data } = await axios.delete(`/projects/${id}`);
    return data;
  },
};
