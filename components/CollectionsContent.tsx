"use client";

import { Button } from "@/components/ui/button";
import { Download, Heart, Clock, TrendingUp, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";

// Dummy keychain data
const DUMMY_KEYCHAINS = [
  { id: "1", name: "Geometric Star", creator: "Designer123", likes: 234, seed: 1 },
  { id: "2", name: "Minimalist Logo", creator: "ArtStudio", likes: 189, seed: 2 },
  { id: "3", name: "Abstract Waves", creator: "CreativeMinds", likes: 312, seed: 3 },
  { id: "4", name: "Tech Badge", creator: "TechDesign", likes: 156, seed: 4 },
  { id: "5", name: "Nature Leaf", creator: "EcoDesigns", likes: 278, seed: 5 },
  { id: "6", name: "Music Note", creator: "SoundStudio", likes: 201, seed: 6 },
  { id: "7", name: "Space Rocket", creator: "CosmicDesign", likes: 445, seed: 7 },
  { id: "8", name: "Coffee Cup", creator: "CafeDesigns", likes: 167, seed: 8 },
  { id: "9", name: "Abstract Circle", creator: "ModernArt", likes: 223, seed: 9 },
];

// Generate optimized placeholder image URL using placeholder.com
function getPlaceholderImage(seed: number, width = 400, height = 400) {
  // Use different placeholder services for variety
  const services = [
    `https://picsum.photos/seed/${seed}/${width}/${height}`,
    `https://picsum.photos/seed/${seed + 100}/${width}/${height}`,
  ];
  return services[seed % services.length];
}

export function CollectionsContent() {
  const [filter, setFilter] = useState<"today" | "week" | "all">("week");
  const keychains = useQuery(api.keychains.list, { filter });

  // Combine real keychains with dummy data
  const displayKeychains = useMemo(() => {
    const realKeychains = keychains || [];
    // Always show dummy data for demo/showcase
    return DUMMY_KEYCHAINS.map((dummy, index) => ({
      _id: dummy.id,
      name: dummy.name,
      creator: dummy.creator,
      likes: dummy.likes,
      imageUrl: getPlaceholderImage(dummy.seed),
    }));
  }, [keychains]);

  return (
    <div className="pt-8 px-6 pb-12">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-foreground">Trending Keychains</h1>
            <p className="text-muted-foreground">Discover amazing 3D keychain designs from our community</p>
          </div>
          
          {/* Time Filter */}
          <div className="flex gap-2 bg-[#FAF9F6] rounded-lg p-1 border border-border">
            <Button
              size="sm"
              variant={filter === "today" ? "default" : "ghost"}
              onClick={() => setFilter("today")}
              className={filter === "today" ? "bg-primary hover:bg-primary/90 text-white" : ""}
            >
              <Clock className="w-4 h-4 mr-1" />
              Today
            </Button>
            <Button
              size="sm"
              variant={filter === "week" ? "default" : "ghost"}
              onClick={() => setFilter("week")}
              className={filter === "week" ? "bg-primary hover:bg-primary/90 text-white" : ""}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Week
            </Button>
            <Button
              size="sm"
              variant={filter === "all" ? "default" : "ghost"}
              onClick={() => setFilter("all")}
              className={filter === "all" ? "bg-primary hover:bg-primary/90 text-white" : ""}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              All Time
            </Button>
          </div>
        </div>

        {/* Grid of Model Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayKeychains.map((keychain) => (
            <div
              key={keychain._id}
              className="bg-[#FAF9F6] rounded-xl overflow-hidden group cursor-pointer border border-border shadow-lg hover:shadow-xl transition-all hover:-translate-y-1"
            >
              {/* Model Preview */}
              <div className="aspect-square relative overflow-hidden bg-gray-100">
                <Image
                  src={keychain.imageUrl}
                  alt={keychain.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>

              {/* Card Info */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-foreground">{keychain.name}</h3>
                    <p className="text-sm text-muted-foreground">by {keychain.creator}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full hover:bg-primary/10 hover:text-primary"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="w-4 h-4 fill-primary text-primary" />
                    <span>{keychain.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

