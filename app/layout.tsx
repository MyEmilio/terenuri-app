import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./components/nav-bar";

export const metadata: Metadata = {
  title: "Imobiliare Invest",
  description: "Platformă inteligentă de investiții imobiliare",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>
        <NavBar />
        <div style={{ flex: 1, overflow: "auto", minHeight: 0 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
