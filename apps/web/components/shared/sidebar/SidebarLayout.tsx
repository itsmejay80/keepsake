import { Suspense } from "react";
import ErrorFallback from "@/components/dashboard/ErrorFallback";
import Header from "@/components/dashboard/header/Header";
import DemoModeBanner from "@/components/DemoModeBanner";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ui/spinner";
import ValidAccountCheck from "@/components/utils/ValidAccountCheck";
import { ErrorBoundary } from "react-error-boundary";

import serverConfig from "@karakeep/shared/config";

export default function SidebarLayout({
  children,
  mobileSidebar,
  sidebar,
  modal,
}: {
  children: React.ReactNode;
  mobileSidebar: React.ReactNode;
  sidebar: React.ReactNode;
  modal?: React.ReactNode;
}) {
  return (
    <div className="sm:fixed sm:inset-0 sm:overflow-hidden">
      <Header />
      <div className="flex min-h-[calc(100vh-60px)] w-full flex-col sm:h-[calc(100dvh-60px)] sm:flex-row sm:overflow-hidden">
        <ValidAccountCheck />
        <div className="hidden flex-none sm:flex">{sidebar}</div>
        <main className="flex-1 bg-background sm:min-h-0 sm:overflow-y-auto">
          {serverConfig.demoMode && <DemoModeBanner />}
          <div className="block w-full sm:hidden">
            {mobileSidebar}
            <Separator />
          </div>
          {modal}
          <div className="min-h-30 container mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:px-8 lg:py-7">
            <ErrorBoundary fallback={<ErrorFallback />}>
              <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
