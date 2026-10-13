import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function HomePage() {
  const userCount = await db.user.count();
  if (userCount === 0) {
    redirect("/onboarding/initial-owner");
  }
  redirect("/dashboard");
}

