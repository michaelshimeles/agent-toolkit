import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LogsClient from "./logs-client";

export default async function LogsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <LogsClient clerkId={userId} />;
}
