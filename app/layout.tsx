import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
