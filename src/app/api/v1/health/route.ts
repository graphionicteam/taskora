import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "taskora-api",
    version: "v1",
    timestamp: new Date().toISOString(),
  });
}
