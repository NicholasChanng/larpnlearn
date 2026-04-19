"use client";

import { useMemo, useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useThemeManifest } from "@/lib/useTheme";
import type { ThemeAvatar } from "@/lib/types";
import {
  CHARACTER_PRICES,
  useUserStore,
  type AvatarCharacterId,
} from "@/store/useUserStore";

const CHARACTER_ORDER: AvatarCharacterId[] = ["boy", "girl", "satyr"];

export default function ShopPage() {
  const manifest = useThemeManifest();
  const points = useUserStore((s) => s.points);
  const owned = useUserStore((s) => s.ownedCharacters);
  const equipped = useUserStore((s) => s.avatarCharacter);
  const setAvatarCharacter = useUserStore((s) => s.setAvatarCharacter);
  const purchaseCharacter = useUserStore((s) => s.purchaseCharacter);
  const [flash, setFlash] = useState<{ id: AvatarCharacterId; kind: "ok" | "err"; msg: string } | null>(null);

  const cards = useMemo(() => {
    if (!manifest) return [];
    return CHARACTER_ORDER.map((id) => {
      const avatar = manifest.avatars.find((a) => a.id === id);
      return avatar ? { id, avatar } : null;
    }).filter((x): x is { id: AvatarCharacterId; avatar: ThemeAvatar } => x !== null);
  }, [manifest]);

  function handleBuy(id: AvatarCharacterId) {
    const result = purchaseCharacter(id);
    if (result === "ok") {
      setAvatarCharacter(id);
      setFlash({ id, kind: "ok", msg: `Purchased & equipped!` });
    } else if (result === "insufficient_points") {
      setFlash({ id, kind: "err", msg: "Not enough points." });
    }
    setTimeout(() => setFlash(null), 2000);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-black to-slate-950">
      <TopBar />
      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="font-pixel text-4xl font-bold tracking-wider text-yellow-100 drop-shadow">
              SHOP
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Purchase new heroes with points earned in battle. Equip anyone you own.
            </p>
          </div>
          <div className="rounded-md border-2 border-yellow-500/60 bg-black/60 px-4 py-2 text-right shadow-lg backdrop-blur">
            <div className="text-[10px] uppercase tracking-widest text-yellow-400/80">Balance</div>
            <div className="font-pixel text-2xl font-bold text-yellow-100">
              {points.toLocaleString()} pts
            </div>
          </div>
        </div>

        {!manifest && <p className="text-slate-400">Loading shop…</p>}

        {manifest && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {cards.map(({ id, avatar }) => {
              const price = CHARACTER_PRICES[id];
              const isOwned = owned.includes(id);
              const isEquipped = equipped === id;
              const canAfford = points >= price;
              const preview = avatar.sprite_gif ?? avatar.sprite;

              return (
                <div
                  key={id}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-2xl border-4 bg-gradient-to-b p-5 shadow-2xl transition",
                    isEquipped
                      ? "border-yellow-400 from-yellow-900/40 to-black shadow-[0_0_40px_rgba(252,211,77,0.35)]"
                      : isOwned
                        ? "border-emerald-500 from-emerald-950/40 to-black"
                        : "border-slate-700 from-slate-900 to-black",
                  )}
                >
                  {isEquipped && (
                    <div className="absolute right-3 top-3 rounded-full bg-yellow-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
                      Equipped
                    </div>
                  )}
                  {!isEquipped && isOwned && (
                    <div className="absolute right-3 top-3 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-black">
                      Owned
                    </div>
                  )}

                  <div className="flex h-48 items-center justify-center rounded-xl bg-black/40">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt={avatar.name ?? id}
                        className="h-40 w-40 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                    ) : (
                      <span className="text-6xl">{avatar.emoji ?? "🧍"}</span>
                    )}
                  </div>

                  <div className="mt-4 flex items-baseline justify-between">
                    <div>
                      <div className="font-pixel text-lg font-bold uppercase tracking-wider text-white">
                        {avatar.name ?? id}
                      </div>
                      <div className="text-xs text-slate-400 capitalize">{id}</div>
                    </div>
                    <div className="text-right">
                      {price === 0 ? (
                        <div className="text-sm font-bold text-emerald-400">Starter</div>
                      ) : (
                        <div className="font-pixel text-sm font-bold text-yellow-200">
                          {price.toLocaleString()} pts
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    {isEquipped ? (
                      <Button disabled className="w-full">
                        Equipped
                      </Button>
                    ) : isOwned ? (
                      <Button
                        className="w-full"
                        onClick={() => setAvatarCharacter(id)}
                      >
                        Equip
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        disabled={!canAfford}
                        onClick={() => handleBuy(id)}
                      >
                        {canAfford ? `Buy for ${price.toLocaleString()} pts` : "Not enough points"}
                      </Button>
                    )}
                  </div>

                  {flash?.id === id && (
                    <div
                      className={cn(
                        "mt-2 text-center text-xs font-semibold",
                        flash.kind === "ok" ? "text-emerald-400" : "text-red-400",
                      )}
                    >
                      {flash.msg}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
