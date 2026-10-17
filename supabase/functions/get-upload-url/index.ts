import { fail, json, serveJson } from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";
import { presign } from "../_shared/r2.ts";

const MAX_BYTES = 50 * 1024 * 1024;
const TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

serveJson(async (req, body) => {
  const user = await requireUser(req, ["admin", "teacher"]);

  const fileName = String(body.file_name ?? "");
  const size = Number(body.file_size ?? 0);
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (!TYPES[ext]) fail(422, "نوع الملف غير مسموح");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) fail(422, "حجم الملف غير مقبول (الأقصى 50MB)");

  const now = new Date();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  // Key MUST start with resources/{user_id}/ : the DB constraint resources_key_owner enforces it.
  const key = `resources/${user.id}/${now.getUTCFullYear()}/${mm}/${crypto.randomUUID()}.${ext}`;
  const contentType = TYPES[ext];

  const url = await presign("PUT", key, 600);
  return json({ url, key, contentType });
});
