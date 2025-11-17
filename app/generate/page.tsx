"use client";

import { Navbar } from "@/components/Navbar";
import { ViewportCanvasWrapper } from "@/components/ViewportCanvasWrapper";
import { CustomizationPanel } from "@/components/CustomizationPanel";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function GeneratePage() {
  const [stlStorageId, setStlStorageId] = useState<Id<"_storage"> | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [customization, setCustomization] = useState({
    thickness: 5,
    holeX: 50,
    holeY: 50,
    hasHole: true,
    previewColor: "#40E0D0",
    text: "",
    fontSize: 24,
    fontFamily: "Arial",
    textColor: "#000000",
    texturePlacement: "front-back" as "front" | "back" | "front-back" | "all",
  });

  const handleHolePositionChange = (x: number, y: number) => {
    setCustomization(prev => ({ ...prev, holeX: x, holeY: y }));
  };

  return (
    <div className="h-screen flex flex-col bg-[#FAF9F6]">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left/Center: 3D Viewport (70%) */}
        <div className="flex-1 p-6">
          <ViewportCanvasWrapper 
            stlStorageId={stlStorageId}
            imageDataUrl={imageDataUrl}
            customization={customization}
            onHolePositionChange={handleHolePositionChange}
          />
        </div>

        {/* Right: Customization Panel (30%) */}
        <div className="w-[400px] flex-shrink-0">
          <CustomizationPanel 
            onStlGenerated={setStlStorageId}
            onImageUploaded={setImageDataUrl}
            onCustomizationChange={setCustomization}
          />
        </div>
      </div>
    </div>
  );
}

