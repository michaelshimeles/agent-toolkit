import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import UsageClient from "./usage-client";

export default async function UsagePage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <UsageClient clerkId={userId} />;
}
