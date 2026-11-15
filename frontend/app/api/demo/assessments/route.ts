import { sameOriginPost } from "@/lib/auth-server";
import { forwardAssessment } from "@/lib/backend-proxy";
import { clientAddress } from "@/lib/rate-limit";

/** Public scoring for the sample scenarios. The backend rate-limits it per visitor. */
export const POST = sameOriginPost(async (request) => {
  const client = clientAddress(request);
  return forwardAssessment(request, "/demo/assessments", client === "unknown" ? {} : { "X-Demo-Client": client });
});
