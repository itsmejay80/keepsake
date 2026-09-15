import { useTranslation } from "@/lib/i18n/server";
import { TFunction } from "i18next";

import MobileSidebarItem from "./ModileSidebarItem";
import { TSidebarItem } from "./TSidebarItem";

export default async function MobileSidebar({
  items,
}: {
  items: (t: TFunction) => TSidebarItem[];
}) {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();
  return (
    <aside
      className="w-full overflow-x-auto bg-background"
      aria-label={t("common.navigation", { defaultValue: "Main navigation" })}
    >
      <ul className="flex min-w-max gap-1 px-3 py-2">
        {items(t).map((item) => (
          <MobileSidebarItem
            key={item.name}
            logo={item.icon}
            name={item.name}
            path={item.path}
          />
        ))}
      </ul>
    </aside>
  );
}
