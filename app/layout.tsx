import { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Providers } from "./providers";
import { AppLayout } from "@/components/layouts/AppLayout";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/options";

export const metadata: Metadata = {
  title: "Cerebero",
  description: "Your second brain for saving important web links.",
  keywords:
    "second-brain, notes, knowledge-management, data-storage, personal-wiki, information-organization, digital-memory ,PKM",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${GeistSans.className} antialiased`}>
        <Providers session={session}>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}
