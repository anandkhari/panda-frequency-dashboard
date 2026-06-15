import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DashboardProvider } from "@/store/dashboardStore";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { getThemeInitScript } from "@/components/theme/theme";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Panda Hub",
  description: "Booking frequency dashboard for Panda Hub",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        <script
          id="theme-init"
          dangerouslySetInnerHTML={{ __html: getThemeInitScript() }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--theme-background)] text-[var(--theme-foreground)]">
        <ThemeToggle />
        <DashboardProvider>
          {children}
        </DashboardProvider>
      </body>
    </html>
  );
}
