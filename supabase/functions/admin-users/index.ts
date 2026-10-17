import { fail, json, serveJson } from "../_shared/http.ts";
import { adminClient, requireUser } from "../_shared/auth.ts";

const ROLES = ["teacher", "counselor", "admin_staff", "supervisor"];

serveJson(async (req, body) => {
  const caller = await requireUser(req, ["admin"]);
  const admin = adminClient();

  if (body.action === "create") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");
    const role = String(body.role ?? "");
    const phone = body.phone ? String(body.phone).trim() : null;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail(422, "البريد غير صالح");
    if (name.length < 2) fail(422, "الاسم مطلوب");
    if (password.length < 8) fail(422, "كلمة المرور 8 أحرف على الأقل");
    if (!ROLES.includes(role)) fail(422, "دور غير صالح");

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role }, // not user-editable
      user_metadata: { name, phone },
    });
    if (error) fail(400, error.message);

    // handle_new_user trigger created the profile; make sure it's active with the right data.
    const { error: upErr } = await admin
      .from("profiles")
      .update({ name, phone, role, is_active: true })
      .eq("id", data.user!.id);
    if (upErr) fail(500, "Profile update failed");

    return json({ id: data.user!.id }, 201);
  }

  if (body.action === "delete") {
    const id = String(body.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) fail(422, "id invalid");
    if (id === caller.id) fail(400, "لا يمكنك حذف حسابك");

    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) {
      // FK restrict: the user owns resources/announcements.
      fail(409, "لا يمكن حذف مستخدم لديه محتوى. قم بتعطيل الحساب بدلاً من ذلك.");
    }
    return json({ ok: true });
  }

  fail(400, "Unknown action");
});
