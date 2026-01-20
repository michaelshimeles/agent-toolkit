import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SkillsClient from "./skills-client";

export default async function SkillsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <SkillsClient clerkId={userId} />;
}
