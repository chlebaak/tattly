"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityFilter } from "@/components/city-filter";

type Props = {
  initialQ: string;
  initialCity: string;
};

export function ArtistsSearch({ initialQ, initialCity }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [city, setCity] = useState(initialCity);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (city.trim()) params.set("city", city.trim());
      const search = params.toString();
      router.replace(search ? `/artists?${search}` : "/artists");
    }, 400);
    return () => clearTimeout(timer);
  }, [q, city, router]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="artist-q">Jméno</Label>
        <Input
          id="artist-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Hledat podle jména…"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="artist-city">Město</Label>
        <CityFilter
          id="artist-city"
          value={initialCity}
          onChange={setCity}
          placeholder="Město (např. Praha)"
        />
      </div>
    </div>
  );
}
