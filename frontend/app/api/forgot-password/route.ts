import { accountError, json, parseEmail, requireAuthQuota, sameOriginPost, serverAuth } from "@/lib/auth-server";

export const POST = sameOriginPost(async (request) => {
  requireAuthQuota(request, "forgot-password");
  const input = await request.json().catch(() => null);
  const email = parseEmail(input?.email);
  const client = await serverAuth();
  const { error } = await client.auth.resetPasswordForEmail(email);
  if (error) throw accountError(error);
  return json({ ok: true });
});
