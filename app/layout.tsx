import { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cerebero",
  description: "Your second brain for saving important web links.",
  keywords:
    "second-brain, notes, knowledge-management, data-storage, personal-wiki, information-organization, digital-memory ,PKM",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
