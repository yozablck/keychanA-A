"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Id } from "@/convex/_generated/dataModel";

interface ViewportCanvasWrapperProps {
  stlStorageId: Id<"_storage"> | null;
  imageDataUrl: string | null;
  customization: {
    thickness: number;
    holeX: number;
    holeY: number;
    hasHole: boolean;
    previewColor: string;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    textColor?: string;
  };
  onHolePositionChange?: (x: number, y: number) => void;
}

// Dynamically import ViewportCanvas with SSR disabled using default export wrapper
// This ensures React Three Fiber is never loaded during SSR
const ViewportCanvasDynamic = dynamic(
  () => {
    // Double-check we're on the client
    if (typeof window === "undefined") {
      return Promise.resolve(() => null);
    }
    return import("./ViewportCanvasClient");
  },
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-border flex items-center justify-center">
        <p className="text-muted-foreground">Loading 3D viewport...</p>
      </div>
    ),
  }
);

export const ViewportCanvasWrapper = ({ 
  stlStorageId, 
  imageDataUrl, 
  customization,
  onHolePositionChange
}: ViewportCanvasWrapperProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure we're on the client and React is fully initialized
    if (typeof window !== "undefined") {
      setMounted(true);
    }
  }, []);

  if (!mounted || typeof window === "undefined") {
    return (
      <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-border flex items-center justify-center">
        <p className="text-muted-foreground">Loading 3D viewport...</p>
      </div>
    );
  }

  return (
    <ViewportCanvasDynamic 
      stlStorageId={stlStorageId}
      imageDataUrl={imageDataUrl}
      customization={customization}
      onHolePositionChange={onHolePositionChange}
    />
  );
};

