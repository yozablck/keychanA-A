"use client";

import { ViewportCanvas } from "./ViewportCanvas";
import { Id } from "@/convex/_generated/dataModel";

interface ViewportCanvasClientProps {
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

// This file exists solely to provide a default export for dynamic import
export default function ViewportCanvasClient({ 
  stlStorageId, 
  imageDataUrl, 
  customization,
  onHolePositionChange
}: ViewportCanvasClientProps) {
  return (
    <ViewportCanvas 
      stlStorageId={stlStorageId}
      imageDataUrl={imageDataUrl}
      customization={customization}
      onHolePositionChange={onHolePositionChange}
    />
  );
}

