import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import IntegrationsClient from "./integrations-client";

export default async function IntegrationsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();

  return (
    <IntegrationsClient
      clerkId={userId}
      email={user?.primaryEmailAddress?.emailAddress || ""}
      name={user?.fullName || undefined}
      imageUrl={user?.imageUrl || undefined}
    />
  );
}
