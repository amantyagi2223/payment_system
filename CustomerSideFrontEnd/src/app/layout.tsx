import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ChatSupportWidget from "@/components/ChatSupportWidget";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <Navbar />
        <main className="w-full min-h-screen">
          {children}
        </main>
        <ChatSupportWidget />
        <Footer />
      </body>
    </html>
  );
}
