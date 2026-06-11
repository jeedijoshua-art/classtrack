import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ClassTrack | Real-Time Geofenced Classroom Attendance",
  description:
    "ClassTrack verifies smart classroom attendance using dynamic geofences and moving-average GPS coordinates to prevent proxies without requiring any app installations.",
  keywords: [
    "attendance",
    "geofence",
    "GPS",
    "classroom",
    "tracking",
    "QR code",
    "real-time",
  ],
  authors: [{ name: "ClassTrack" }],
  openGraph: {
    title: "ClassTrack | Real-Time Geofenced Classroom Attendance",
    description:
      "Verify student presence with GPS geofencing. No app installation required.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const saved = localStorage.getItem('theme');
                  if (saved === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
