import { useTranslation } from "@/lib/i18n/server";
import { TFunction } from "i18next";

import serverConfig from "@karakeep/shared/config";

import SidebarItem from "./SidebarItem";
import SidebarVersion from "./SidebarVersion";
import { TSidebarItem } from "./TSidebarItem";

export default async function Sidebar({
  items,
  extraSections,
}: {
  items: (t: TFunction) => TSidebarItem[];
  extraSections?: React.ReactNode;
}) {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();

  return (
    <aside
      className="flex h-[calc(100vh-60px)] w-60 flex-col gap-4 border-r border-border/70 bg-background p-3 xl:w-72"
      aria-label={t("common.navigation", { defaultValue: "Main navigation" })}
    >
      <div>
        <ul className="space-y-1 text-sm">
          {items(t).map((item) => (
            <SidebarItem
              key={item.name}
              logo={item.icon}
              name={item.name}
              path={item.path}
            />
          ))}
        </ul>
      </div>
      {extraSections}
      <SidebarVersion
        serverVersion={serverConfig.serverVersion}
        changeLogVersion={serverConfig.changelogVersion}
      />
    </aside>
  );
}
