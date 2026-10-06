import { api } from "@/api/client";
import type { User, UserRole } from "@/types";

export interface UserListResponse {
  items: User[];
  total: number;
}

export interface UserCreateInput {
  full_name: string;
  email: string;
  role: UserRole;
  department_id?: string | null;
  password?: string | null;
}

export interface UserCreateResponse extends User {
  temp_password: string | null;
}

export async function listUsers(params: {
  role?: UserRole;
  department_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<UserListResponse> {
  const { data } = await api.get<UserListResponse>("/users", { params });
  return data;
}

export async function createUser(input: UserCreateInput): Promise<UserCreateResponse> {
  const { data } = await api.post<UserCreateResponse>("/users", input);
  return data;
}

export async function deactivateUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

export async function activateUser(userId: string): Promise<User> {
  const { data } = await api.patch<User>(`/users/${userId}`, { is_active: true });
  return data;
}

export async function bulkImportUsers(file: File): Promise<{ created: number; errors: string[] }> {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/users/bulk-import", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
