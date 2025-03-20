import { Providers } from "./providers";
import { getServerSession } from "next-auth";
 
export default async function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return <Providers session={session}>{children}</Providers>;
}
