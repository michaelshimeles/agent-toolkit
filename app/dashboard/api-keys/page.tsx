import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import ApiKeysClient from "./api-keys-client";

export default async function ApiKeysPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <ApiKeysClient />;
}
