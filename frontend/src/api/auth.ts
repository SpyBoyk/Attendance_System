import { api } from "@/api/client";
import type { User } from "@/types";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>("/auth/login", { email, password });
  return data;
}

export async function loginFace(photo: Blob): Promise<TokenResponse> {
  const form = new FormData();
  form.append("photo", photo, "face.jpg");
  const { data } = await api.post<TokenResponse>("/auth/login-face", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export interface RegisterResponse {
  detail: string;
  user: User;
}

export async function register(
  fullName: string,
  email: string,
  password: string,
  photo: File,
): Promise<RegisterResponse> {
  const form = new FormData();
  form.append("full_name", fullName);
  form.append("email", email);
  form.append("password", password);
  form.append("photo", photo);
  const { data } = await api.post<RegisterResponse>("/auth/register", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  await api.post("/auth/change-password", { current_password, new_password });
}
