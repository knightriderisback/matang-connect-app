import { createAdminClient } from "./admin";

/**
 * Canonical service-role client for privileged server-side operations.
 * Bypasses RLS — callers MUST authenticate and verify authorization before invoking.
 */
export const createServiceRoleClient = createAdminClient;
export default createServiceRoleClient;
