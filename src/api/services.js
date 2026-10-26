// Supabase data layer — replaces the old axios/Laravel layer.
// Return shapes mimic the old API (r.subject.name, r.uploader.name, a.author.name, { data, meta })
// so the pages only need small changes.
import { supabase } from "./supabase";

const PER_PAGE = 12;

/* ───────────── helpers ───────────── */
function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

/** Human readable (Arabic) message for a Supabase/Postgres error. */
export function errMsg(e, fallback = "حدث خطأ غير متوقع") {
  if (!e) return fallback;
  if (e.code === "23503") return "العملية مرفوضة: العنصر مرتبط ببيانات أخرى.";
  if (e.code === "23505") return "هذا العنصر موجود مسبقاً.";
  if (e.code === "23514") return "قيمة غير مقبولة، راجع الحقول.";
  if (e.code === "42501" || /row-level security|permission denied|forbidden/i.test(e.message || "")) {
    return "غير مصرح لك بهذه العملية.";
  }
  if (/Failed to fetch|NetworkError/i.test(e.message || "")) return "تعذّر الاتصال بالخادم. تحقق من الإنترنت.";
  return e.message || fallback;
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

async function currentUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

/** Reads every row of a query (PostgREST caps a response at 1000 rows). `build` must return a fresh query. */
async function selectAll(build) {
  const size = 1000;
  const all = [];
  for (let from = 0; ; from += size) {
    const { data, error } = await build().range(from, from + size - 1);
    if (error) throw error;
    all.push(...data);
    if (data.length < size) break;
  }
  return all;
}

// Strip characters that would break PostgREST's .or() grammar.
const sanitize = (s) => String(s).replace(/[,()%*\\:"']/g, " ").trim();

const pagination = (count, page, perPage) => ({
  total: count ?? 0,
  current_page: page,
  last_page: Math.max(1, Math.ceil((count ?? 0) / perPage)),
});

/* ───────────── Auth ───────────── */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/Failed to fetch|NetworkError/i.test(error.message)) throw new Error(errMsg(error));
    throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    throw new Error("الحساب غير مفعّل. تواصل مع المدير.");
  }
  // Compatibility with components that read localStorage.auth_user
  try {
    localStorage.setItem("auth_user", JSON.stringify(profile));
  } catch (_) {}
  supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", profile.id).then(() => {});
  return profile;
}

export async function logout() {
  try {
    await supabase.auth.signOut();
  } finally {
    try {
      localStorage.removeItem("auth_user");
      localStorage.removeItem("auth_token");
    } catch (_) {}
  }
}

export async function getCurrentProfile() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
  return data && data.is_active ? data : null;
}

/** Verifies the current password, then sets the new one and signs out the other sessions. */
export async function changePassword(currentPassword, newPassword) {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email;
  if (!email) throw new Error("غير مسجّل الدخول");

  const { error: verifyErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyErr) throw new Error("كلمة المرور الحالية غير صحيحة");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    if (/different from the old/i.test(error.message)) throw new Error("كلمة المرور الجديدة يجب أن تختلف عن الحالية");
    if (/at least|characters/i.test(error.message)) throw new Error("كلمة المرور قصيرة جداً");
    throw new Error("فشل تغيير كلمة المرور");
  }
  await supabase.auth.signOut({ scope: "others" });
}

/* ───────────── Reference data ───────────── */
// `!grade_level_subject` pins the many-to-many embed to that junction table.
export const getGradeLevels = async () =>
  unwrap(
    await supabase
      .from("grade_levels")
      .select("*, subjects!grade_level_subject(id,name,code,icon,color)")
      .order("year_number")
      .order("id")
  );

export const getSubjects = async () => unwrap(await supabase.from("subjects").select("*").order("name"));

/** Subjects with their resource count and the ids of the levels they belong to (Settings screen). */
export async function getSubjectsAdmin() {
  const rows = unwrap(
    await supabase
      .from("subjects")
      .select("*, resources(count), grade_levels!grade_level_subject(id)")
      .order("name")
  );
  return rows.map((s) => ({
    ...s,
    resources_count: s.resources?.[0]?.count ?? 0,
    grade_level_ids: (s.grade_levels || []).map((l) => l.id),
  }));
}

export const getAcademicYears = async () =>
  unwrap(await supabase.from("academic_years").select("*").order("start_date", { ascending: false }));

export async function getCurrentYear() {
  const { data } = await supabase.from("academic_years").select("*").eq("is_current", true).maybeSingle();
  return data || null;
}

export const getClassrooms = async (gradeLevelId) => {
  let q = supabase
    .from("classrooms")
    .select("*, grade_level:grade_levels(id,name,code), academic_year:academic_years(id,label)")
    .order("grade_level_id")
    .order("name");
  if (gradeLevelId) q = q.eq("grade_level_id", gradeLevelId);
  return unwrap(await q);
};

export async function createAcademicYear({ label, start_date, end_date, is_current }) {
  const row = unwrap(
    await supabase
      .from("academic_years")
      .insert({ label: label.trim(), start_date, end_date, is_current: false })
      .select("id")
      .single()
  );
  if (is_current) await setCurrentAcademicYear(row.id);
  return row.id;
}

export const setCurrentAcademicYear = (id) => supabase.rpc("set_current_academic_year", { p_id: id }).then(unwrap);

// Adds/removes junction rows so the set matches `wanted` (insert first, so a failure never loses links).
async function syncLevelSubjects(ownerCol, ownerId, otherCol, wanted) {
  const current = unwrap(await supabase.from("grade_level_subject").select(otherCol).eq(ownerCol, ownerId)).map(
    (r) => r[otherCol]
  );
  const want = (wanted || []).map(Number);
  const toAdd = want.filter((x) => !current.includes(x));
  const toDel = current.filter((x) => !want.includes(x));
  if (toAdd.length) {
    unwrap(await supabase.from("grade_level_subject").insert(toAdd.map((o) => ({ [ownerCol]: ownerId, [otherCol]: o }))));
  }
  if (toDel.length) {
    unwrap(await supabase.from("grade_level_subject").delete().eq(ownerCol, ownerId).in(otherCol, toDel));
  }
}

export async function saveGradeLevel(f) {
  const row = {
    name: f.name.trim(),
    code: f.code.trim(),
    year_number: Number(f.year_number),
    stream: f.stream || null,
  };
  let id = f.id;
  if (id) unwrap(await supabase.from("grade_levels").update(row).eq("id", id));
  else id = unwrap(await supabase.from("grade_levels").insert(row).select("id").single()).id;
  await syncLevelSubjects("grade_level_id", id, "subject_id", f.subject_ids);
  return id;
}
export const deleteGradeLevel = async (id) => unwrap(await supabase.from("grade_levels").delete().eq("id", id));

export async function saveSubject(f) {
  const row = {
    name: f.name.trim(),
    name_fr: f.name_fr?.trim() || null,
    code: f.code.trim(),
    icon: f.icon?.trim() || null,
    color: f.color || null,
  };
  let id = f.id;
  if (id) unwrap(await supabase.from("subjects").update(row).eq("id", id));
  else id = unwrap(await supabase.from("subjects").insert(row).select("id").single()).id;
  await syncLevelSubjects("subject_id", id, "grade_level_id", f.grade_level_ids);
  return id;
}
export const deleteSubject = async (id) => unwrap(await supabase.from("subjects").delete().eq("id", id));

export async function saveClassroom(f) {
  const row = {
    grade_level_id: Number(f.grade_level_id),
    academic_year_id: Number(f.academic_year_id),
    name: f.name.trim(),
    capacity: f.capacity ? Number(f.capacity) : null,
  };
  if (f.id) return unwrap(await supabase.from("classrooms").update(row).eq("id", f.id));
  return unwrap(await supabase.from("classrooms").insert(row));
}
export const deleteClassroom = async (id) => unwrap(await supabase.from("classrooms").delete().eq("id", id));

/* ───────────── Resources ───────────── */
const RES_SELECT = "*, subject:subjects(id,name,code,icon,color), grade_level:grade_levels(id,name,code)";
const normalizeResource = (r) => ({ ...r, uploader: { id: r.user_id, name: r.uploader_name } });

/**
 * { type | types[], gradeLevelId, subjectId, semester, search, page, perPage, mine }
 * Returns { data, meta: { total, current_page, last_page } }
 */
export async function getResources({
  type,
  types,
  gradeLevelId,
  subjectId,
  semester,
  search,
  page = 1,
  perPage = PER_PAGE,
  mine = false,
} = {}) {
  let q = supabase
    .from("resources")
    .select(RES_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (type) q = q.eq("type", type);
  if (types && types.length) q = q.in("type", types);
  if (gradeLevelId) q = q.eq("grade_level_id", gradeLevelId);
  if (subjectId) q = q.eq("subject_id", subjectId);
  if (semester) q = q.eq("semester", semester);
  if (mine) {
    const uid = await currentUserId();
    if (!uid) return { data: [], meta: pagination(0, page, perPage) };
    q = q.eq("user_id", uid);
  }
  const s = search ? sanitize(search) : "";
  if (s) q = q.or(`title.ilike.%${s}%,description.ilike.%${s}%`);

  const { data, error, count } = await q;
  if (error) throw error;
  return { data: data.map(normalizeResource), meta: pagination(count, page, perPage) };
}

function putWithProgress(url, file, contentType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("فشل رفع الملف")));
    xhr.onerror = () => reject(new Error("فشل رفع الملف. تحقق من الاتصال وإعدادات CORS."));
    xhr.send(file);
  });
}

/**
 * meta: { title, description, type, subject_id, academic_year_id, semester }
 * gradeLevelIds: one or more levels. The file is uploaded to R2 ONCE and one `resources`
 * row per level is inserted (single INSERT = all-or-nothing). Rows share the same file_key,
 * which is why delete-resource only removes the R2 object when the last row is gone.
 * (Legacy: a single `meta.grade_level_id` still works when gradeLevelIds is omitted.)
 * Either `file` (→ Cloudflare R2) or `externalUrl` (https only).
 */
export async function uploadResource({ file, externalUrl, meta, gradeLevelIds, onProgress }) {
  const uid = await currentUserId();
  if (!uid) throw new Error("غير مسجّل الدخول");

  // Validate BEFORE uploading so a bad selection never leaves an orphan object in R2.
  const levels = [
    ...new Set(
      (gradeLevelIds?.length ? gradeLevelIds : [meta?.grade_level_id])
        .filter((v) => v !== "" && v != null)
        .map(Number)
    ),
  ];
  if (!levels.length || levels.some((n) => !Number.isInteger(n) || n <= 0)) {
    throw new Error("اختر مستوىً واحداً على الأقل");
  }

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

  const { grade_level_id: _single, ...rest } = meta;
  const clean = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== "" && v != null));
  const rows = levels.map((grade_level_id) => ({ ...clean, grade_level_id, ...fileFields, user_id: uid }));
  const { data, error } = await supabase.from("resources").insert(rows).select();
  // If the insert fails the R2 object stays orphaned (no row to reference it); a lifecycle rule can purge those.
  if (error) throw error;
  return data;
}

/** Opens the file: a presigned R2 link, or the legacy Google Drive link. */
export async function downloadResource(id) {
  // Open the tab synchronously (inside the click) so popup blockers allow it.
  const w = window.open("", "_blank");
  if (w) w.opener = null;
  try {
    const { url } = await invoke("get-download-url", { id });
    if (w) w.location.href = url;
    else window.location.href = url;
  } catch (e) {
    if (w) w.close();
    throw e;
  }
}

export const deleteResource = (id) => invoke("delete-resource", { id });

export async function updateResource(id, fields) {
  const allowed = ["title", "description", "type", "grade_level_id", "subject_id", "academic_year_id", "semester", "is_published"];
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => allowed.includes(k)));
  return unwrap(await supabase.from("resources").update(patch).eq("id", id).select().single());
}

/* ───────────── Admin ───────────── */
/** { stats, recent_resources, top_downloaded } — same shape the Laravel /dashboard returned. */
export async function getDashboard() {
  const [stats, recent, top] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase.from("resources").select(RES_SELECT).order("created_at", { ascending: false }).limit(5),
    supabase.from("resources").select("id,title,download_count").order("download_count", { ascending: false }).limit(5),
  ]);
  return {
    stats: unwrap(stats),
    recent_resources: unwrap(recent).map(normalizeResource),
    top_downloaded: unwrap(top).filter((r) => r.download_count > 0),
  };
}

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
  return { data, meta: pagination(count, page, perPage) };
}

export const getTeachers = async () =>
  unwrap(await supabase.from("profiles").select("id,name,email").eq("role", "teacher").eq("is_active", true).order("name"));

export const createUser = (u) => invoke("admin-users", { action: "create", ...u });
export const deleteUser = (id) => invoke("admin-users", { action: "delete", id });
export const setUserActive = async (id, is_active) =>
  unwrap(await supabase.from("profiles").update({ is_active }).eq("id", id).select().single());
export const updateProfile = async (id, fields) => {
  const patch = Object.fromEntries(Object.entries(fields).filter(([k]) => ["name", "phone", "avatar"].includes(k)));
  return unwrap(await supabase.from("profiles").update(patch).eq("id", id).select().single());
};

/** JSON backup of the school data (never includes passwords: they live in auth.users). */
export async function exportBackup() {
  const tables = [
    ["academic_years", "id"],
    ["grade_levels", "id"],
    ["subjects", "id"],
    ["grade_level_subject", "grade_level_id"],
    ["classrooms", "id"],
    ["teacher_subjects", "id"],
    ["profiles", "id"],
    ["resources", "id"],
    ["announcements", "id"],
    ["timetables", "id"],
  ];
  const out = { exported_at: new Date().toISOString(), format_version: 1 };
  for (const [table, orderCol] of tables) {
    out[table] = await selectAll(() => supabase.from(table).select("*").order(orderCol));
  }
  return out;
}

/* ───────────── Announcements ───────────── */
const normalizeAnnouncement = (a) => ({ ...a, author: { id: a.user_id, name: a.author_name } });

export const getAnnouncements = async () =>
  unwrap(await supabase.from("announcements").select("*").order("published_at", { ascending: false, nullsFirst: false })).map(
    normalizeAnnouncement
  );

export const createAnnouncement = async ({ title, body, audience, expires_at }) =>
  // user_id / author_name / published_by_role / published_at are filled by a DB trigger.
  unwrap(await supabase.from("announcements").insert({ title, body, audience, expires_at: expires_at || null }).select().single());

export const deleteAnnouncement = async (id) => unwrap(await supabase.from("announcements").delete().eq("id", id));

/* ───────────── Notifications ───────────── */
export const getNotifications = async ({ unreadOnly = true } = {}) => {
  let q = supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (unreadOnly) q = q.is("read_at", null);
  return unwrap(await q);
};

export const markNotificationRead = async (id) =>
  unwrap(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id));

export const markAllNotificationsRead = async () =>
  unwrap(await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null));

/* ───────────── Timetable ───────────── */
export const getTimetable = async (classroomId, yearId) =>
  unwrap(
    await supabase
      .from("timetables")
      .select("*, subject:subjects(id,name,color,icon), teacher:profiles(id,name)")
      .eq("classroom_id", classroomId)
      .eq("academic_year_id", yearId)
      .order("start_time")
  );

export const replaceTimetable = (classroomId, yearId, slots) =>
  supabase.rpc("replace_timetable", { p_classroom_id: classroomId, p_year_id: yearId, p_slots: slots }).then(unwrap);

/** Public timetable page: every classroom of the current year with all its slots. */
export async function getTimetableOverview() {
  const year = await getCurrentYear();
  if (!year) return { year: null, classrooms: [], slots: [] };

  const classrooms = unwrap(
    await supabase
      .from("classrooms")
      .select("id,name,grade_level:grade_levels(id,name,year_number)")
      .eq("academic_year_id", year.id)
      .order("grade_level_id")
      .order("name")
  );
  const slots = await selectAll(() =>
    supabase
      .from("timetables")
      .select("classroom_id,day,start_time,end_time,is_break,subject:subjects(id,name,icon,color)")
      .eq("academic_year_id", year.id)
      .order("id")
  );
  return { year, classrooms, slots };

  
}

export const PUBLIC_AUDIENCES = ["all", "students", "parents"];
export const getPublicAnnouncements = async () =>
  unwrap(
    await supabase
      .from("announcements")
      .select("id,title,body,audience,author_name,published_at,expires_at")
      .eq("is_published", true)
      .in("audience", PUBLIC_AUDIENCES)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(60)
  );