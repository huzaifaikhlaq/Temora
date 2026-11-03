import Link from "next/link";
import { Icon } from "@/components/shared/icon";

export const authInputClass =
  "mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";

export const authPrimaryClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700";

export function AuthLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
      <span className="grid size-9 place-items-center rounded-xl bg-violet-600 text-white">
        <Icon name="layers" />
      </span>
      Temora
    </Link>
  );
}
