import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";
import { writeAuditLog } from "@/lib/audit";
import {
  getClientIp,
  checkIpRateLimit,
  withAccountLock,
  checkAccountLockout,
  performDummyHashComparison,
  recordNonexistentAccountFailure,
  recordFailedAttempt,
  resetAccountLockout,
} from "@/lib/auth/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const ipCheck = checkIpRateLimit(ip);
    if (!ipCheck.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts from this network. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipCheck.retryAfterSeconds || 900),
          },
        }
      );
    }

    const { phone, mpin } = await request.json();
    if (!phone || !mpin) {
      return NextResponse.json({ error: "Phone and M-PIN are required" }, { status: 400 });
    }
    const cleanPhone = String(phone).replace(/\D/g, "").slice(-10);
    if (!/^\d{10}$/.test(cleanPhone)) {
      return NextResponse.json({ error: "Enter a valid 10-digit phone number" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(String(mpin))) {
      return NextResponse.json({ error: "M-PIN must be exactly 4 digits" }, { status: 400 });
    }

    return await withAccountLock(cleanPhone, async () => {
      const admin = createAdminClient();

      // Prefer full row; fall back to core columns if schema is thin
      let row: any = null;
      {
        const full = await admin
          .from("users")
          .select(
            "id, full_name, phone, role, city_id, native_village, qr_code_id, verification_status, m_pin_hash, created_at, title, failed_mpin_attempts, mpin_locked_until"
          )
          .eq("phone", cleanPhone)
          .maybeSingle();

        if (full.error) {
          const core = await admin
            .from("users")
            .select(
              "id, full_name, phone, role, city_id, qr_code_id, verification_status, m_pin_hash, failed_mpin_attempts, mpin_locked_until"
            )
            .eq("phone", cleanPhone)
            .maybeSingle();

          if (core.error) {
            const legacy = await admin
              .from("users")
              .select("id, full_name, phone, role, city_id, qr_code_id, verification_status, m_pin_hash")
              .eq("phone", cleanPhone)
              .maybeSingle();

            if (legacy.error) {
              console.error("login select:", legacy.error.message);
              return NextResponse.json({ error: "Login failed", detail: legacy.error.message }, { status: 500 });
            }
            row = legacy.data;
          } else {
            row = core.data;
          }
        } else {
          row = full.data;
        }
      }

      if (!row) {
        // Prevent user enumeration side-channels:
        // 1. Equalize execution timing via pre-hashed bcrypt comparison
        await performDummyHashComparison(String(mpin));
        // 2. Track failed attempts for non-existent numbers
        const dummyFail = recordNonexistentAccountFailure(cleanPhone);
        if (dummyFail.isLocked) {
          return NextResponse.json(
            {
              error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${dummyFail.remainingMinutes || 15} minutes or contact an administrator.`,
              remainingMinutes: dummyFail.remainingMinutes || 15,
            },
            { status: 423 }
          );
        }
        return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
      }

      // Check account lockout status before performing expensive bcrypt check
      const lockout = checkAccountLockout(row, cleanPhone);
      if (lockout.isLocked) {
        return NextResponse.json(
          {
            error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${lockout.remainingMinutes || 15} minute${(lockout.remainingMinutes || 15) > 1 ? "s" : ""} or contact an administrator.`,
            remainingMinutes: lockout.remainingMinutes,
            lockedUntil: lockout.lockedUntil,
          },
          { status: 423 }
        );
      }

      const hash = row.m_pin_hash || "";
      let ok = false;
      if (hash) {
        try {
          ok = await bcrypt.compare(String(mpin), hash);
        } catch {
          ok = false;
        }
      }

      if (!ok) {
        const attemptResult = await recordFailedAttempt(admin, row, ip, cleanPhone);
        if (attemptResult.locked) {
          return NextResponse.json(
            {
              error: "Account is temporarily locked due to multiple failed login attempts. Please try again in 15 minutes or contact an administrator.",
              remainingMinutes: 15,
              lockedUntil: attemptResult.lockedUntil,
            },
            { status: 423 }
          );
        }
        return NextResponse.json({ error: "Invalid phone number or M-PIN" }, { status: 401 });
      }

      // Successful login: reset failed attempts & lockout state
      await resetAccountLockout(admin, row.id, cleanPhone);

      await writeAuditLog({ actorId: row.id, action: "user_login", targetId: row.id });

      const token = await createSessionToken({
        userId: row.id,
        role: row.role as any,
        cityId: row.city_id,
        fullName: row.full_name,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: row.id,
          full_name: row.full_name,
          fullName: row.full_name,
          phone: row.phone || cleanPhone,
          role: row.role,
          city_id: row.city_id,
          native_village: row.native_village || null,
          verification_status: row.verification_status,
          verificationStatus: row.verification_status,
          qr_code_id: row.qr_code_id,
          qrCodeId: row.qr_code_id,
          title: row.title || null,
          cities: null,
          created_at: row.created_at || null,
        },
        pendingVerification: row.verification_status !== "verified",
      });
      response.cookies.set(sessionCookieOptions.name, token, sessionCookieOptions);
      return response;
    });
  } catch (err: any) {
    console.error("Login route error:", err);
    return NextResponse.json({ error: "Something went wrong", detail: err?.message }, { status: 500 });
  }
}
