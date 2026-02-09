import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { getServerSession } from "next-auth";

export async function getUserId() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return null;
  }

  return session.user.id;
}
