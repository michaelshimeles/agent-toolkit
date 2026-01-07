import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import BuilderClient from "./builder-client";

export default async function BuilderPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <BuilderClient clerkId={userId} />;
}
