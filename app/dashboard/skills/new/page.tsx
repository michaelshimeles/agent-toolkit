import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import NewSkillClient from "./new-skill-client";

export default async function NewSkillPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <NewSkillClient clerkId={userId} />;
}
