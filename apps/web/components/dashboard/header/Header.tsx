import Link from "next/link";
import { redirect } from "next/navigation";
import GlobalActions from "@/components/dashboard/GlobalActions";
import ProfileOptions from "@/components/dashboard/header/ProfileOptions";
import { SearchInput } from "@/components/dashboard/search/SearchInput";
import KarakeepLogo from "@/components/KarakeepIcon";
import { getServerAuthSession } from "@/server/auth";

export default async function Header() {
  const session = await getServerAuthSession();
  if (!session) {
    redirect("/");
  }

  return (
    <header className="sticky left-0 right-0 top-0 z-50 flex h-[60px] items-center justify-between gap-3 border-b border-border/70 bg-background/90 px-3 backdrop-blur-xl sm:px-4">
      <div className="hidden items-center sm:flex">
        <Link
          href={"/dashboard/bookmarks"}
          aria-label="Karakeep home"
          className="flex w-56 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:w-[17rem]"
        >
          <KarakeepLogo height={32} />
        </Link>
      </div>
      <div className="mx-auto flex min-w-0 flex-1 items-center gap-2">
        <SearchInput className="max-w-3xl rounded-xl border border-border/70 bg-card shadow-sm transition-[border-color,box-shadow] duration-150 focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/15" />
        <GlobalActions />
      </div>
      <div className="flex items-center">
        <ProfileOptions />
      </div>
    </header>
  );
}
