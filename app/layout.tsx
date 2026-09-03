import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnsavedChangesProvider from "@/components/admin/UnsavedChangesProvider";
import "./globals.css";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <UnsavedChangesProvider>
          <Header />
          {children}
          <Footer />
        </UnsavedChangesProvider>
      </body>
    </html>
  );
}
