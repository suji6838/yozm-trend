import { currentUser } from "@clerk/nextjs/server";

const ADMIN_EMAILS = ["joan6838@gmail.com"];

export async function getAdminUser() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (email && ADMIN_EMAILS.includes(email)) {
    return { email };
  }
  return null;
}
