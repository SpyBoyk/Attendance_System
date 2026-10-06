import { api } from "@/api/client";
import type { UserRole } from "@/types";

export interface FaceEnrollment {
  user_id: string;
  photo_base64: string;
  enrolled_at: string;
}

export interface EnrollmentStatus {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  enrolled: boolean;
}

export async function enrollFace(userId: string, photo: File | Blob): Promise<FaceEnrollment> {
  const form = new FormData();
  form.append("photo", photo, "photo.jpg");
  const { data } = await api.post<FaceEnrollment>(`/enrollment/face/${userId}`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getFaceEnrollment(userId: string): Promise<FaceEnrollment | null> {
  const { data } = await api.get<FaceEnrollment | null>(`/enrollment/face/${userId}`);
  return data;
}

export async function deleteFaceEnrollment(userId: string): Promise<void> {
  await api.delete(`/enrollment/face/${userId}`);
}

export async function getEnrollmentStatus(role?: UserRole): Promise<EnrollmentStatus[]> {
  const { data } = await api.get<EnrollmentStatus[]>("/enrollment/status", { params: { role } });
  return data;
}
