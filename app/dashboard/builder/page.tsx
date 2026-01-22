import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BuilderPageClient from "./builder-page-client";

export default async function BuilderPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <BuilderPageClient clerkId={userId} />;
}
