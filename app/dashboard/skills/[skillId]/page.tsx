import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import SkillEditorClient from "./skill-editor-client";

interface SkillEditorPageProps {
  params: Promise<{ skillId: string }>;
}

export default async function SkillEditorPage({ params }: SkillEditorPageProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { skillId } = await params;

  return <SkillEditorClient clerkId={userId} skillId={skillId} />;
}
