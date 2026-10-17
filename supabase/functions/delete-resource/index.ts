import { fail, json, serveJson } from "../_shared/http.ts";
import { requireUser } from "../_shared/auth.ts";
import { deleteObject } from "../_shared/r2.ts";

serveJson(async (req, body) => {
  const user = await requireUser(req, ["admin", "teacher"]);
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) fail(422, "id invalid");

  // Read + delete AS THE USER: RLS decides whether they may.
  const { data: r } = await user.db.from("resources").select("id,file_key").eq("id", id).maybeSingle();
  if (!r) fail(404, "Not found");

  const { data: deleted, error } = await user.db.from("resources").delete().eq("id", id).select("id");
  if (error) fail(500, "Delete failed");
  if (!deleted || deleted.length === 0) fail(403, "Forbidden");

  // DB row is gone; now the R2 object. A failure here only leaves an orphan file.
  if (r!.file_key) {
    try {
      await deleteObject(r!.file_key);
    } catch (e) {
      console.error("orphan R2 object", r!.file_key, e);
    }
  }
  return json({ ok: true });
});
