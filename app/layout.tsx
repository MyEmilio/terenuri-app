import "./globals.css";
import NavBar from "./components/nav-bar";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body style={{ margin: 0, padding: 0, display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <NavBar />
        <div style={{ flex: 1, overflow: "hidden" }}>
          {children}
        </div>
      </body>
    </html>
  );
}
