import { api } from "@/api/client";
import type { ClassSection, Course, Department, RosterStudent, ScheduledClass } from "@/types";

// --- Departments -------------------------------------------------------------

export async function listDepartments(): Promise<Department[]> {
  const { data } = await api.get<Department[]>("/departments");
  return data;
}

export async function createDepartment(input: { name: string; code: string }): Promise<Department> {
  const { data } = await api.post<Department>("/departments", input);
  return data;
}

export async function updateDepartment(id: string, input: { name?: string; hod_user_id?: string | null }): Promise<Department> {
  const { data } = await api.patch<Department>(`/departments/${id}`, input);
  return data;
}

export async function deleteDepartment(id: string): Promise<void> {
  await api.delete(`/departments/${id}`);
}

// --- Courses -------------------------------------------------------------------

export async function listCourses(departmentId?: string): Promise<Course[]> {
  const { data } = await api.get<Course[]>("/courses", { params: { department_id: departmentId } });
  return data;
}

export async function createCourse(input: {
  code: string;
  name: string;
  department_id: string;
  credits: number;
  semester: number;
}): Promise<Course> {
  const { data } = await api.post<Course>("/courses", input);
  return data;
}

export async function deleteCourse(id: string): Promise<void> {
  await api.delete(`/courses/${id}`);
}

// --- Class sections ---------------------------------------------------------------

export async function listSections(departmentId?: string): Promise<ClassSection[]> {
  const { data } = await api.get<ClassSection[]>("/sections", { params: { department_id: departmentId } });
  return data;
}

export async function createSection(input: {
  name: string;
  department_id: string;
  academic_year: string;
  year_level: number;
}): Promise<ClassSection> {
  const { data } = await api.post<ClassSection>("/sections", input);
  return data;
}

export async function deleteSection(id: string): Promise<void> {
  await api.delete(`/sections/${id}`);
}

export async function enrollStudents(
  sectionId: string,
  input: { student_ids: string[]; course_id: string; academic_year: string },
): Promise<void> {
  await api.post(`/sections/${sectionId}/enroll`, input);
}

export async function getRoster(sectionId: string): Promise<RosterStudent[]> {
  const { data } = await api.get<RosterStudent[]>(`/sections/${sectionId}/roster`);
  return data;
}

// --- Timetable -------------------------------------------------------------------

export async function listTimetable(params: { section_id?: string; teacher_id?: string }): Promise<ScheduledClass[]> {
  const { data } = await api.get<ScheduledClass[]>("/timetable", { params });
  return data;
}

export async function createScheduledClass(input: {
  course_id: string;
  section_id: string;
  teacher_id: string;
  room: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year: string;
}): Promise<ScheduledClass> {
  const { data } = await api.post<ScheduledClass>("/timetable", input);
  return data;
}

export async function deleteScheduledClass(id: string): Promise<void> {
  await api.delete(`/timetable/${id}`);
}
