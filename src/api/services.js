// Replacement for the axios/Laravel layer. Return shapes mimic the old API where pages depend on them.
import { supabase } from "./supabase";

const PER_PAGE = 12;

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/** Calls an Edge Function and surfaces the { error } message it returned. */
async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let msg = error.message;
    try {
      const j = await error.context.json();
      if (j && j.error) msg = j.error;
    } catch (_) {
      /* keep default message */
    }
    throw new Error(msg);
  }
  return data;
}

/* ───────────── Auth ───────────── */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    throw new Error("الحساب غير مفعّل");
  }
  // Compatibility with existing components that read localStorage.auth_user
  try {
    localStorage.setItem("auth_user", JSON.stringify(profile));
  } catch (_) {}
  supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", profile.id).then(() => {});
  return profile;
}

export async function logout() {
  await supabase.auth.signOut();
  try {
    localStorage.removeItem("auth_user");
    localStorage.removeItem("auth_token");
  } catch (_) {}
}

export async function getCurrentProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  return data && data.is_active ? data : null;
}

/* ───────────── Reference data ───────────── */
export const getGradeLevels = async () =>
  unwrap(await supabase.from("grade_levels").select("*, subjects(id,name,code,icon,color)").order("code"));

export const getSubjects = async () => unwrap(await supabase.from("subjects").select("*").order("name"));

export const getAcademicYears = async () =>
  unwrap(await supabase.from("academic_years").select("*").order("start_date", { ascending: false }));

export const getClassrooms = async (gradeLevelId) => {
  let q = supabase.from("classrooms").select("*").order("name");
  if (gradeLevelId) q = q.eq("grade_level_id", gradeLevelId);
  return unwrap(await q);
};

/* ───────────── Resources ───────────── */
// Strip characters that would break PostgREST's .or() grammar.
const sanitize = (s) => String(s).replace(/[,()%*\\:"']/g, " ").trim();

export async function getResources({ type, gradeLevelId, subjectId, semester, search, page = 1, perPage = PER_PAGE, mine = false } = {}) {
  let q = supabase
    .from("resources")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (type) q = q.eq("type", type);
  if (gradeLevelId) q = q.eq("grade_level_id", gradeLevelId);
  if (subjectId) q = q.eq("subject_id", subjectId);
  if (semester) q = q.eq("semester", semester);
  if (mine) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) q = q.eq("user_id", user.id);
  }
  const s = search ? sanitize(search) : "";
  if (s) q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    data,
    meta: { total: count ?? 0, current_page: page, last_page: Math.max(1, Math.ceil((count ?? 0) / perPage)) },
  };
}

function putWithProgress(url, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("فشل رفع الملف")));
    xhr.onerror = () => reject(new Error("فشل رفع الملف"));
    xhr.send(file);
  });
}

/**
 * meta: { title, description, type, grade_level_id, subject_id, academic_year_id, semester }
 * Either `file` (→ R2) or `externalUrl` (https only).
 */
export async function uploadResource({ file, externalUrl, meta, onProgress }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("غير مسجّل الدخول");

  let fileFields = {};
  if (file) {
    const { url, key, contentType } = await invoke("get-upload-url", { file_name: file.name, file_size: file.size });
    await putWithProgress(url, file, contentType, onProgress);
    fileFields = {
      file_key: key,
      file_name: file.name,
      file_type: file.name.split(".").pop().toLowerCase(),
      file_size: file.size,
    };
  } else if (externalUrl) {
    fileFields = { external_url: externalUrl };
  } else {
    throw new Error("اختر ملفاً أو أدخل رابطاً");
  }

  const { data, error } = await supabase
    .from("resources")
    .insert({ ...meta, ...fileFields, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function downloadResource(id) {
  const { url } = await invoke("get-download-url", { id });
  window.open(url, "_blank", "noopener,noreferrer");
}

export const deleteResource = (id) => invoke("delete-resource", { id });

export async function updateResource(id, fields) {
  const allowed = ["title", "description", "type", "grade_level_id", "subject_id", "academic_year_id", "semester", "is_published"];
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
  return unwrap(await supabase.from("resources").update(patch).eq("id", id).select().single());
}

/* ───────────── Admin ───────────── */
export const getDashboard = async () => unwrap(await supabase.rpc("dashboard_stats"));

export async function getUsers({ search, role, page = 1, perPage = 15 } = {}) {
  let q = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);
  if (role) q = q.eq("role", role);
  const s = search ? sanitize(search) : "";
  if (s) q = q.or(`name.ilike.%${s}%,email.ilike.%${s}%`);
  const { data, error, count } = await q;
  if (error) throw error;
  return { data, meta: { total: count ?? 0, current_page: page, last_page: Math.max(1, Math.ceil((count ?? 0) / perPage)) } };
}

export const createUser = (u) => invoke("admin-users", { action: "create", ...u });
export const deleteUser = (id) => invoke("admin-users", { action: "delete", id });
export const setUserActive = async (id, is_active) =>
  unwrap(await supabase.from("profiles").update({ is_active }).eq("id", id).select().single());
export const updateProfile = async (id, fields) => {
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => ["name", "phone", "avatar"].includes(k)));
  return unwrap(await supabase.from("profiles").update(patch).eq("id", id).select().single());
};
export const changePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};

export const setCurrentAcademicYear = (id) => supabase.rpc("set_current_academic_year", { p_id: id }).then(unwrap);

/* ───────────── Announcements ───────────── */
export const getAnnouncements = async () =>
  unwrap(await supabase.from("announcements").select("*").order("created_at", { ascending: false }));

export const createAnnouncement = async ({ title, body, audience, expires_at }) =>
  // user_id / author_name / published_by_role / published_at are filled by a DB trigger.
  unwrap(await supabase.from("announcements").insert({ title, body, audience, expires_at: expires_at || null }).select().single());

export const deleteAnnouncement = async (id) => unwrap(await supabase.from("announcements").delete().eq("id", id));

/* ───────────── Notifications ───────────── */
export const getNotifications = async () =>
  unwrap(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50));

export const markNotificationRead = async (id) =>
  unwrap(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id));

/* ───────────── Timetable ───────────── */
export const getTimetable = async (classroomId, yearId) =>
  unwrap(
    await supabase
      .from("timetables")
      .select("*, subject:subjects(id,name,color), teacher:profiles(id,name)")
      .eq("classroom_id", classroomId)
      .eq("academic_year_id", yearId)
      .order("start_time")
  );

export const replaceTimetable = (classroomId, yearId, slots) =>
  supabase.rpc("replace_timetable", { p_classroom_id: classroomId, p_year_id: yearId, p_slots: slots }).then(unwrap);
