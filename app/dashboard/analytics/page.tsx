import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AnalyticsClient from "./analytics-client";

export default async function AnalyticsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // This is an admin-only page for viewing anonymous analytics
  // In a production app, you'd check for admin role here
  return <AnalyticsClient />;
}
