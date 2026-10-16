"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { calculateDistanceMeters } from "@/lib/geo";

const officeConfigCache = new Map<string, { office: any; timestamp: number }>();

export async function getOfficeConfig(workspaceId: string) {
  const cached = officeConfigCache.get(workspaceId);
  if (cached && Date.now() - cached.timestamp < 120000) {
    return cached.office;
  }

  let office = await db.officeLocation.findUnique({
    where: { workspaceId },
  });

  if (!office) {
    office = await db.officeLocation.create({
      data: {
        workspaceId,
        name: "Main Office",
        latitude: 23.0225,
        longitude: 72.5714,
        radiusMeters: 100.0,
      },
    });
  }

  officeConfigCache.set(workspaceId, { office, timestamp: Date.now() });
  return office;
}

export async function updateOfficeConfig(
  workspaceId: string,
  data: {
    name?: string;
    latitude: number;
    longitude: number;
    radiusMeters?: number;
  }
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wsContext = await getActiveWorkspaceContext(session.user.id, workspaceId);
  if (!wsContext || (wsContext.role !== "OWNER" && wsContext.role !== "ADMIN")) {
    throw new Error("Only workspace owners and administrators can configure office location.");
  }

  const updated = await db.officeLocation.upsert({
    where: { workspaceId },
    update: {
      name: data.name || "Main Office",
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters ?? 100.0,
    },
    create: {
      workspaceId,
      name: data.name || "Main Office",
      latitude: data.latitude,
      longitude: data.longitude,
      radiusMeters: data.radiusMeters ?? 100.0,
    },
  });

  revalidatePath("/attendance");
  return { success: true, office: updated };
}

const dailyQrCache = new Map<string, { qrDataUrl: string; date: string; office: any; payloadText: string }>();

export async function generateDailyOfficeQr(workspaceId: string) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const cacheKey = `${workspaceId}_${today}`;
  const cached = dailyQrCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const office = await getOfficeConfig(workspaceId);

  // Secure payload representation
  const payload = JSON.stringify({
    app: "taskora",
    type: "office_attendance_qr",
    workspaceId,
    officeName: office.name,
    date: today,
    secret: office.qrSecret.slice(0, 8),
  });

  const qrDataUrl = await QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: {
      dark: "#1e1b4b",
      light: "#ffffff",
    },
  });

  const result = {
    qrDataUrl,
    date: today,
    office,
    payloadText: payload,
  };

  dailyQrCache.set(cacheKey, result);
  return result;
}

export async function recordAttendance(data: {
  workspaceId: string;
  latitude: number;
  longitude: number;
  action: "CHECK_IN" | "CHECK_OUT";
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Authentication required" };

  const wsContext = await getActiveWorkspaceContext(session.user.id, data.workspaceId);
  if (!wsContext) return { error: "Active workspace context not found" };

  const office = await getOfficeConfig(data.workspaceId);
  const distance = calculateDistanceMeters(
    data.latitude,
    data.longitude,
    office.latitude,
    office.longitude
  );

  const allowedRadius = office.radiusMeters || 100.0;

  if (distance > allowedRadius) {
    return {
      error: `Geofence verification failed. You are ${Math.round(
        distance
      )}m away from "${office.name}". Allowed radius is ${allowedRadius}m. Please scan while inside the office.`,
      distance,
      allowedRadius,
    };
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date();

  // Find existing attendance for today
  const existing = await db.attendance.findUnique({
    where: {
      workspaceId_memberId_date: {
        workspaceId: data.workspaceId,
        memberId: wsContext.member.id,
        date: today,
      },
    },
  });

  if (data.action === "CHECK_IN") {
    if (existing && existing.checkInTime) {
      return {
        error: `You have already checked in today at ${new Date(
          existing.checkInTime
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
        record: existing,
      };
    }

    // Determine status (e.g. if after 10:00 AM local, mark as LATE)
    const hours = now.getHours();
    const isLate = hours >= 10 && now.getMinutes() > 15;
    const status = isLate ? "LATE" : "PRESENT";

    const record = await db.attendance.upsert({
      where: {
        workspaceId_memberId_date: {
          workspaceId: data.workspaceId,
          memberId: wsContext.member.id,
          date: today,
        },
      },
      update: {
        checkInTime: now,
        checkInLat: data.latitude,
        checkInLng: data.longitude,
        distanceMeters: distance,
        status,
        verified: true,
        notes: data.notes,
      },
      create: {
        workspaceId: data.workspaceId,
        memberId: wsContext.member.id,
        date: today,
        checkInTime: now,
        checkInLat: data.latitude,
        checkInLng: data.longitude,
        distanceMeters: distance,
        status,
        verified: true,
        notes: data.notes,
      },
    });

    revalidatePath("/attendance");
    return {
      success: true,
      action: "CHECK_IN",
      distance,
      record,
      message: `Successfully checked in at ${now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })} (Verified within ${Math.round(distance)}m of office)`,
    };
  } else {
    // CHECK_OUT
    if (!existing || !existing.checkInTime) {
      return {
        error: "No check-in record found for today. Please check in first before checking out.",
      };
    }

    if (existing.checkOutTime) {
      return {
        error: `You have already checked out today at ${new Date(
          existing.checkOutTime
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`,
      };
    }

    const durationMs = now.getTime() - new Date(existing.checkInTime).getTime();
    const hoursWorked = (durationMs / (1000 * 60 * 60)).toFixed(1);

    const record = await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOutTime: now,
        checkOutLat: data.latitude,
        checkOutLng: data.longitude,
        status: "COMPLETED",
        notes: data.notes || existing.notes,
      },
    });

    revalidatePath("/attendance");
    return {
      success: true,
      action: "CHECK_OUT",
      distance,
      hoursWorked: Number(hoursWorked),
      record,
      message: `Successfully checked out at ${now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}. Total working time: ${hoursWorked} hrs (Verified within ${Math.round(distance)}m).`,
    };
  }
}

export async function getWorkspaceAttendance(workspaceId: string, filterDate?: string) {
  const targetDate = filterDate || new Date().toISOString().split("T")[0];

  const records = await db.attendance.findMany({
    where: {
      workspaceId,
      date: targetDate,
    },
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          designation: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { checkInTime: "asc" },
  });

  return records;
}

export async function getAttendanceHistory(workspaceId: string, limit = 50) {
  const records = await db.attendance.findMany({
    where: { workspaceId },
    include: {
      member: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          designation: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ date: "desc" }, { checkInTime: "desc" }],
    take: limit,
  });

  return records;
}
