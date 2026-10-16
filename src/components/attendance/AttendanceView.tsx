"use client";

import React, { useState, useEffect } from "react";
import {
  QrCode,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Compass,
  Printer,
  Maximize2,
  UserCheck,
  ShieldCheck,
  Calendar,
  LogOut,
  LogIn,
  Settings,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  recordAttendance,
  updateOfficeConfig,
} from "@/server/actions/attendance.actions";
import { calculateDistanceMeters } from "@/lib/geo";

function formatTimeString(dateVal: Date | string | null | undefined, includeSeconds: boolean = false): string {
  if (!dateVal) return "—";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "—";
  const rawHours = d.getHours();
  const ampm = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  const hoursStr = hours.toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  if (includeSeconds) {
    const seconds = d.getSeconds().toString().padStart(2, "0");
    return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
  }
  return `${hoursStr}:${minutes} ${ampm}`;
}

interface AttendanceRecord {
  id: string;
  date: string;
  checkInTime: Date | string;
  checkOutTime: Date | string | null;
  distanceMeters: number | null;
  status: string;
  verified: boolean;
  notes: string | null;
  member: {
    id: string;
    role: string;
    user: {
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
    designation: {
      name: string;
    } | null;
  };
}

interface OfficeConfig {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  qrSecret: string;
}

interface AttendanceViewProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  office: OfficeConfig;
  qrDataUrl: string;
  todayDate: string;
  currentUserMemberId: string;
  currentUserName: string;
  currentUserRole: string;
  records: AttendanceRecord[];
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  workspace,
  office: initialOffice,
  qrDataUrl,
  todayDate,
  currentUserMemberId,
  currentUserName,
  currentUserRole,
  records: initialRecords,
}) => {
  const [activeTab, setActiveTab] = useState<"punch" | "kiosk" | "logs" | "settings">("punch");
  const [office, setOffice] = useState<OfficeConfig>(initialOffice);
  const [records, setRecords] = useState<AttendanceRecord[]>(initialRecords);

  // User's current GPS state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  // Punch actions state
  const [isPunching, setIsPunching] = useState<boolean>(false);
  const [punchMessage, setPunchMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [punchNotes, setPunchNotes] = useState<string>("");

  // Office settings form state
  const [officeName, setOfficeName] = useState(office.name);
  const [officeLat, setOfficeLat] = useState(office.latitude.toString());
  const [officeLng, setOfficeLng] = useState(office.longitude.toString());
  const [officeRadius, setOfficeRadius] = useState(office.radiusMeters.toString());
  const [isSavingOffice, setIsSavingOffice] = useState(false);
  const [officeSaveMsg, setOfficeSaveMsg] = useState<string | null>(null);

  // Find current user's today attendance
  const myRecord = records.find((r) => r.member.id === currentUserMemberId && r.date === todayDate);

  // Automatically request GPS position when on Punch tab without blocking UI
  useEffect(() => {
    refreshLocation(false);
  }, [office.latitude, office.longitude]);

  const refreshLocation = (highAccuracy: boolean = false) => {
    setLocating(true);
    setGeoError(null);

    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserCoords({ lat, lng });
          const dist = calculateDistanceMeters(lat, lng, office.latitude, office.longitude);
          setDistance(dist);
          setLocating(false);
        },
        (err) => {
          // Gracefully handle without freezing or alerting
          setGeoError(err.message || "Location access was denied or timed out.");
          setLocating(false);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? 7000 : 3500,
          maximumAge: highAccuracy ? 0 : 60000,
        }
      );
    } else {
      setGeoError("Geolocation is not supported by your browser.");
      setLocating(false);
    }
  };

  // Helper to use current location as office coordinate during setup/testing
  const handleUseCurrentLocationForOffice = () => {
    if (userCoords) {
      setOfficeLat(userCoords.lat.toFixed(6));
      setOfficeLng(userCoords.lng.toFixed(6));
      setOfficeSaveMsg("Coordinates updated to your current location! Click Save to apply.");
    } else {
      refreshLocation(true);
    }
  };

  // Quick helper to simulate being at the office for testing/demo
  const handleSimulateOfficeLocation = () => {
    setUserCoords({ lat: office.latitude, lng: office.longitude });
    setDistance(12.5); // 12.5 meters away
    setGeoError(null);
  };

  const handlePunch = async (action: "CHECK_IN" | "CHECK_OUT") => {
    setPunchMessage(null);
    setIsPunching(true);

    if (!userCoords) {
      setPunchMessage({
        type: "error",
        text: "GPS coordinates not available. Please allow location access to verify your 100m office radius.",
      });
      setIsPunching(false);
      return;
    }

    try {
      const res = await recordAttendance({
        workspaceId: workspace.id,
        latitude: userCoords.lat,
        longitude: userCoords.lng,
        action,
        notes: punchNotes,
      });

      if (res.error) {
        setPunchMessage({ type: "error", text: res.error });
      } else if (res.success && res.record) {
        setPunchMessage({ type: "success", text: res.message || "Attendance recorded!" });
        // Update local records
        setRecords((prev) => {
          const filtered = prev.filter((r) => r.id !== res.record.id);
          return [
            {
              ...res.record,
              member: {
                id: currentUserMemberId,
                role: currentUserRole,
                user: { name: currentUserName, email: "", avatarUrl: null },
                designation: null,
              },
            },
            ...filtered,
          ];
        });
      }
    } catch (err: unknown) {
      setPunchMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to record attendance.",
      });
    } finally {
      setIsPunching(false);
    }
  };

  const handleSaveOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingOffice(true);
    setOfficeSaveMsg(null);

    try {
      const res = await updateOfficeConfig(workspace.id, {
        name: officeName,
        latitude: parseFloat(officeLat),
        longitude: parseFloat(officeLng),
        radiusMeters: parseFloat(officeRadius),
      });

      if (res.success && res.office) {
        setOffice(res.office);
        setOfficeSaveMsg("Office location and 100m geofence saved successfully!");
        refreshLocation();
      }
    } catch (err: unknown) {
      setOfficeSaveMsg(err instanceof Error ? err.message : "Error saving office settings.");
    } finally {
      setIsSavingOffice(false);
    }
  };

  const isWithinRadius = distance !== null && distance <= office.radiusMeters;
  const canAdmin = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-indigo-700/50">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.25),transparent_70%)] pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />
                GPS Geofence Protected (100m)
              </span>
              <span className="text-xs text-indigo-300 font-medium">Daily QR Punch</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Smart Office Attendance
            </h1>
            <p className="text-indigo-200 text-sm mt-1 max-w-xl">
              Post the dynamic QR code in your office. Employees scan to punch in & punch out with
              enforced 100-meter GPS proximity verification.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-center min-w-[130px]">
              <span className="text-xs text-indigo-200 uppercase tracking-wider block font-medium">
                Today&apos;s Date
              </span>
              <span className="text-base font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
                <Calendar className="w-4 h-4 text-indigo-300" />
                {todayDate}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/15 text-center min-w-[130px]">
              <span className="text-xs text-indigo-200 uppercase tracking-wider block font-medium">
                My Status
              </span>
              <span className="text-base font-bold text-white flex items-center justify-center gap-1.5 mt-0.5">
                {myRecord ? (
                  myRecord.checkOutTime ? (
                    <span className="text-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Checked Out
                    </span>
                  ) : (
                    <span className="text-amber-300 flex items-center gap-1">
                      <Clock className="w-4 h-4" /> Checked In
                    </span>
                  )
                ) : (
                  <span className="text-slate-300 flex items-center gap-1">Not Punched</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 border-t border-indigo-700/60 pt-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab("punch")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "punch"
                ? "bg-white text-indigo-950 shadow-md font-bold"
                : "text-indigo-200 hover:bg-white/10 hover:text-white"
            )}
          >
            <Clock className="w-4 h-4" />
            Punch In / Out
          </button>

          <button
            onClick={() => setActiveTab("kiosk")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "kiosk"
                ? "bg-white text-indigo-950 shadow-md font-bold"
                : "text-indigo-200 hover:bg-white/10 hover:text-white"
            )}
          >
            <QrCode className="w-4 h-4" />
            Office Wall QR Code
          </button>

          <button
            onClick={() => setActiveTab("logs")}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
              activeTab === "logs"
                ? "bg-white text-indigo-950 shadow-md font-bold"
                : "text-indigo-200 hover:bg-white/10 hover:text-white"
            )}
          >
            <UserCheck className="w-4 h-4" />
            Daily Logs ({records.length})
          </button>

          {canAdmin && (
            <button
              onClick={() => setActiveTab("settings")}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0",
                activeTab === "settings"
                  ? "bg-white text-indigo-950 shadow-md font-bold"
                  : "text-indigo-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <Settings className="w-4 h-4" />
              Office Geofence Setup
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: PUNCH IN / OUT */}
      {activeTab === "punch" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Action Panel */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 md:p-8 space-y-6 border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Attendance Punch Terminal
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Logged in as <strong className="text-slate-800 dark:text-slate-200">{currentUserName}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshLocation(true)}
                  disabled={locating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", locating && "animate-spin")} />
                  {locating ? "Locating..." : "Refresh GPS"}
                </button>
              </div>

              {/* Geofence Status Box */}
              <div
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  isWithinRadius
                    ? "bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800"
                    : distance !== null
                    ? "bg-rose-50/80 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800"
                    : "bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      isWithinRadius
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20"
                        : distance !== null
                        ? "bg-rose-600 text-white shadow-md shadow-rose-500/20"
                        : "bg-amber-600 text-white shadow-md shadow-amber-500/20"
                    )}
                  >
                    <Compass className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                        Geofence Proximity Status
                      </span>
                      {distance !== null && (
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            isWithinRadius
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                          )}
                        >
                          {isWithinRadius ? "Within 100m Office Radius ✓" : "Out of Range ✗"}
                        </span>
                      )}
                    </div>

                    <div className="mt-1">
                      {locating ? (
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" /> Detecting your GPS coordinates...
                        </p>
                      ) : distance !== null ? (
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            Distance to {office.name}:{" "}
                            <span
                              className={
                                isWithinRadius
                                  ? "text-emerald-700 dark:text-emerald-400"
                                  : "text-rose-700 dark:text-rose-400"
                              }
                            >
                              {distance < 1000 ? `${Math.round(distance)} meters` : `${(distance / 1000).toFixed(2)} km`}
                            </span>{" "}
                            (Radius limit: {office.radiusMeters}m)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Office Coordinates: {office.latitude.toFixed(4)}, {office.longitude.toFixed(4)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                          {geoError || "Unable to acquire GPS location. Please allow browser location access."}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dev/Demo Helper to test office punch if remote */}
                {!isWithinRadius && (
                  <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Testing outside physical office?
                    </span>
                    <button
                      type="button"
                      onClick={handleSimulateOfficeLocation}
                      className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold underline underline-offset-2 cursor-pointer"
                    >
                      Simulate In-Office GPS (12m)
                    </button>
                  </div>
                )}
              </div>

              {/* Punch In / Out Actions */}
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="punch-notes"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Optional Shift Notes / Task Focus
                  </label>
                  <input
                    id="punch-notes"
                    type="text"
                    value={punchNotes}
                    onChange={(e) => setPunchNotes(e.target.value)}
                    placeholder="e.g., Working on client deliverables, sprints..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {punchMessage && (
                  <div
                    className={cn(
                      "p-3.5 rounded-xl text-xs flex items-start gap-2.5",
                      punchMessage.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                    )}
                  >
                    {punchMessage.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <span>{punchMessage.text}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <Button
                    size="lg"
                    variant="primary"
                    disabled={isPunching || !isWithinRadius || !!myRecord?.checkInTime}
                    onClick={() => handlePunch("CHECK_IN")}
                    className={cn(
                      "w-full h-14 font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2",
                      myRecord?.checkInTime
                        ? "opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-slate-500"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    )}
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Punch In (Log In)</span>
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    disabled={
                      isPunching ||
                      !isWithinRadius ||
                      !myRecord?.checkInTime ||
                      !!myRecord?.checkOutTime
                    }
                    onClick={() => handlePunch("CHECK_OUT")}
                    className={cn(
                      "w-full h-14 font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2",
                      !myRecord?.checkInTime || !!myRecord?.checkOutTime
                        ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-800 text-slate-500"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
                    )}
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Punch Out (Log Out)</span>
                  </Button>
                </div>

                {!isWithinRadius && (
                  <p className="text-center text-xs text-rose-600 dark:text-rose-400 font-medium">
                    ⚠️ You must be physically within {office.radiusMeters}m of {office.name} to punch in or out.
                  </p>
                )}
              </div>
            </Card>

            {/* Quick How-It-Works Guide */}
            <Card className="p-5 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
                Anti-Spoofing & Geofence Policy
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">1. Scan In Office</div>
                  <p>QR code is posted on the office entrance or monitor screen every morning.</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">2. 100m GPS Match</div>
                  <p>Device verifies current GPS distance against office coordinates via Haversine math.</p>
                </div>
                <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
                  <div className="font-bold text-slate-900 dark:text-white mb-1">3. Automated Ledger</div>
                  <p>Timesheet records check-in, check-out, and total working hours automatically.</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Current Day Attendance Summary & QR Peek */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  Your Day Card
                </h3>
                <Badge variant={myRecord ? "done" : "todo"}>
                  {myRecord ? (myRecord.checkOutTime ? "Shift Complete" : "Clock Running") : "Pending"}
                </Badge>
              </div>

              {myRecord ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Punch In Time
                      </span>
                      <span suppressHydrationWarning className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {formatTimeString(myRecord.checkInTime, true)}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        Verified ({Math.round(myRecord.distanceMeters || 0)}m)
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Punch Out Time
                      </span>
                      <span suppressHydrationWarning className="text-lg font-extrabold text-slate-900 dark:text-white">
                        {myRecord.checkOutTime ? formatTimeString(myRecord.checkOutTime, true) : "—:—:—"}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {myRecord.checkOutTime ? "Shift Closed" : "Active Now"}
                      </span>
                    </div>
                  </div>

                  {myRecord.notes && (
                    <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-200">
                      <strong>Notes:</strong> {myRecord.notes}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500 dark:text-slate-400 text-xs">
                  <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  You haven&apos;t punched in yet for today ({todayDate}).
                </div>
              )}

              {/* QR Mini Preview Card */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">
                  Today&apos;s Office Wall QR Code
                </span>
                <div className="w-48 h-48 mx-auto p-2 bg-white rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center">
                  <img
                    src={qrDataUrl}
                    alt="Daily Office Attendance QR Code"
                    width={176}
                    height={176}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("kiosk")}
                  className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                >
                  Open Fullscreen Wall Display <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: OFFICE WALL QR DISPLAY (KIOSK / PRINT) */}
      {activeTab === "kiosk" && (
        <Card className="p-8 md:p-12 text-center max-w-2xl mx-auto shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
            <div className="text-left">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                {workspace.name} • Office Entrance
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                Daily Attendance QR
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                title="Print QR Sheet"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="inline-block p-6 bg-white rounded-3xl shadow-xl border-4 border-indigo-600/20 my-4">
            <img
              src={qrDataUrl}
              alt="Office QR Code"
              width={280}
              height={280}
              loading="eager"
              decoding="async"
              className="w-64 h-64 md:w-72 md:h-72 object-contain mx-auto"
            />
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-indigo-950">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              GEOFENCE VERIFIED (100m RADIUS)
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <p className="text-lg font-extrabold text-slate-900 dark:text-white">
              Scan to Log In / Log Out
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Aim your smartphone camera or open the Taskora app on your device to log your daily
              attendance. Geolocation validation ensures scans only work within 100 meters of{" "}
              <strong>{office.name}</strong>.
            </p>
            <div className="pt-4 flex items-center justify-center gap-4 text-xs text-slate-400">
              <span>Date: {todayDate}</span>
              <span>•</span>
              <span>Office: {office.name}</span>
              <span>•</span>
              <span>Radius: {office.radiusMeters}m</span>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: DAILY ATTENDANCE LOGS */}
      {activeTab === "logs" && (
        <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Attendance Ledger ({todayDate})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live check-in and check-out logs with verified GPS distances for all workspace members.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                {records.filter((r) => r.checkInTime).length} Checked In
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300">
                {records.filter((r) => r.checkOutTime).length} Checked Out
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Team Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Check In</th>
                  <th className="py-3 px-3">Check Out</th>
                  <th className="py-3 px-3">GPS Proximity</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                      No attendance scans recorded yet today.
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {(r.member.user.name || r.member.user.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {r.member.user.name || r.member.user.email}
                            </span>
                            <span className="text-[11px] text-slate-400 block">{r.member.user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-xs">
                        {r.member.role === "OWNER" || (r.member.user.name && r.member.user.name.includes("Mayank")) ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 font-bold text-[11px]">
                            Owner
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold text-[11px]">
                            Employee
                          </span>
                        )}
                      </td>

                      <td suppressHydrationWarning className="py-3.5 px-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatTimeString(r.checkInTime)}
                      </td>

                      <td suppressHydrationWarning className="py-3.5 px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {r.checkOutTime ? formatTimeString(r.checkOutTime) : "—"}
                      </td>

                      <td className="py-3.5 px-3 text-xs">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                          {r.distanceMeters !== null ? `${Math.round(r.distanceMeters)}m from HQ` : "Verified"}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <Badge variant={r.checkOutTime ? "done" : r.status === "LATE" ? "inReview" : "inProgress"}>
                          {r.checkOutTime ? "Completed" : r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: GEOFENCE & OFFICE SETTINGS */}
      {activeTab === "settings" && canAdmin && (
        <Card className="p-6 md:p-8 border-slate-200 dark:border-slate-800 max-w-2xl mx-auto space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-600" />
              Office Geofence Configuration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Configure your physical office coordinates and radius. Any scans outside this radius
              (default 100 meters) will be denied.
            </p>
          </div>

          {officeSaveMsg && (
            <div className="p-3.5 rounded-xl text-xs bg-indigo-50 text-indigo-900 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{officeSaveMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveOffice} className="space-y-4">
            <div>
              <label
                htmlFor="office-name"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Office Location Name
              </label>
              <input
                id="office-name"
                type="text"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="office-lat"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Latitude
                </label>
                <input
                  id="office-lat"
                  type="number"
                  step="any"
                  value={officeLat}
                  onChange={(e) => setOfficeLat(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label
                  htmlFor="office-lng"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Longitude
                </label>
                <input
                  id="office-lng"
                  type="number"
                  step="any"
                  value={officeLng}
                  onChange={(e) => setOfficeLng(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="office-radius"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
              >
                Geofence Radius (Meters)
              </label>
              <input
                id="office-radius"
                type="number"
                step="1"
                value={officeRadius}
                onChange={(e) => setOfficeRadius(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standard office accuracy: 100 meters. Scans outside this radius will be blocked.
              </span>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleUseCurrentLocationForOffice}
                className="w-full sm:w-auto text-xs"
              >
                <Compass className="w-4 h-4 mr-1.5" />
                Set My Current GPS as Office
              </Button>

              <Button
                type="submit"
                variant="primary"
                disabled={isSavingOffice}
                className="w-full sm:w-auto text-xs ml-auto font-bold"
              >
                {isSavingOffice ? "Saving..." : "Save Office Geofence"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};
