"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, Download } from "lucide-react";
import { useState, useRef } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";

interface CustomizationPanelProps {
  onStlGenerated?: (stlStorageId: Id<"_storage">) => void;
  onImageUploaded?: (imageDataUrl: string) => void;
  onCustomizationChange?: (customization: {
    thickness: number;
    holeX: number;
    holeY: number;
    hasHole: boolean;
    previewColor: string;
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    textColor?: string;
    texturePlacement?: "front" | "back" | "front-back" | "all";
  }) => void;
}

export const CustomizationPanel = ({ 
  onStlGenerated, 
  onImageUploaded,
  onCustomizationChange 
}: CustomizationPanelProps) => {
  const [baseThickness, setBaseThickness] = useState([5]);
  const [textHeight, setTextHeight] = useState([2]);
  const [text, setText] = useState("");
  const [fontStyle, setFontStyle] = useState("arial");
  const [hasHole, setHasHole] = useState(true);
  const [holeX, setHoleX] = useState([50]);
  const [holeY, setHoleY] = useState([50]);
  const [previewColor, setPreviewColor] = useState("#40E0D0");
  const [texturePlacement, setTexturePlacement] = useState<"front" | "back" | "front-back" | "all">("front-back");
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [generatedStlId, setGeneratedStlId] = useState<Id<"_storage"> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      
      // Process all image files directly (PNG, JPG, etc.)
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImageDataUrl(dataUrl);
        if (onImageUploaded) {
          onImageUploaded(dataUrl);
        }
        toast.success(`Image "${file.name}" uploaded successfully`);
      };
      reader.readAsDataURL(file);
    } else {
      setUploadedImage(null);
      setImageDataUrl(null);
      if (onImageUploaded) {
        onImageUploaded(null);
      }
    }
  };

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createStl = useAction(api.generate.createStl);
  const createKeychain = useMutation(api.keychains.create);
  const getStorageUrl = useQuery(
    api.storage.getStorageUrl,
    generatedStlId ? { storageId: generatedStlId } : "skip"
  );

  const handleDownload = async () => {
    if (!generatedStlId || !getStorageUrl) {
      toast.error("No STL file available to download");
      return;
    }

    try {
      const response = await fetch(getStorageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `keychain-${Date.now()}.stl`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("STL file downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download STL file");
    }
  };

  const handleGenerate = async () => {
    if (!uploadedImage) {
      toast.error("Please upload an image first");
      return;
    }

    setIsGenerating(true);

    try {
      // 1. Get upload URL and upload image
      const uploadUrl = await generateUploadUrl();
      const uploadResult = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": uploadedImage.type },
        body: uploadedImage,
      });
      
      if (!uploadResult.ok) {
        throw new Error("Failed to upload image");
      }

      // Convex storage returns the storageId as an object with storageId property
      const uploadResponse = await uploadResult.json();
      const imageStorageId = typeof uploadResponse === 'string' 
        ? uploadResponse 
        : uploadResponse.storageId || uploadResponse;

      // 2. Generate STL using Convex action
      const { stlStorageId } = await createStl({
        imageStorageId,
        options: {
          thickness: baseThickness[0],
          textHeight: textHeight[0],
          text: text || undefined,
          fontStyle: fontStyle || undefined,
          hasHole,
          holeX: holeX[0],
          holeY: holeY[0],
        },
      });

      // 3. Save keychain record
      await createKeychain({
        name: uploadedImage.name.replace(/\.[^/.]+$/, ""), // Remove extension
        creator: "Anonymous", // TODO: Get from auth
        stlStorageId,
        imageStorageId,
        options: {
          thickness: baseThickness[0],
          textHeight: textHeight[0],
          text: text || undefined,
          fontStyle: fontStyle || undefined,
          hasHole,
          holeX: holeX[0],
          holeY: holeY[0],
        },
      });

      toast.success("3D model generated successfully!");
      
      // Notify parent component to display the 3D model
      if (onStlGenerated) {
        onStlGenerated(stlStorageId);
      }
      
      // Store stlStorageId for download
      setGeneratedStlId(stlStorageId);

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to generate 3D model");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full bg-[#FAF9F6] border-l border-border p-6 overflow-y-auto">
      <div className="space-y-8">
        {/* Step 1: Upload Image */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Step 1: Upload Your Image</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer"
          >
            <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
            {uploadedImage ? (
              <>
                <p className="text-sm text-foreground font-medium mb-1">{uploadedImage.name}</p>
                <p className="text-xs text-muted-foreground">Click to change</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-1">Click to upload</p>
                <p className="text-xs text-muted-foreground">PNG or JPG (Max 10MB)</p>
              </>
            )}
          </div>
        </div>

        {/* Step 2: Add Text */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Step 2: Add Text (Optional)</h3>
          <Input
            placeholder="Enter text..."
            className="mb-3"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (onCustomizationChange) {
                  onCustomizationChange({
                    thickness: baseThickness[0],
                    holeX: holeX[0],
                    holeY: holeY[0],
                    hasHole,
                    previewColor,
                    texturePlacement,
                    text: e.target.value,
                    fontSize: textHeight[0] * 10, // Convert mm to approximate px
                    fontFamily: fontStyle,
                    textColor: "#000000",
                  });
              }
            }}
          />
          <Select value={fontStyle} onValueChange={(value) => {
            setFontStyle(value);
            if (onCustomizationChange && text) {
              onCustomizationChange({
                thickness: baseThickness[0],
                holeX: holeX[0],
                holeY: holeY[0],
                hasHole,
                previewColor,
                texturePlacement,
                text,
                fontSize: textHeight[0] * 10,
                fontFamily: value,
                textColor: "#000000",
              });
            }
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="arial">Arial</SelectItem>
              <SelectItem value="helvetica">Helvetica</SelectItem>
              <SelectItem value="times">Times New Roman</SelectItem>
              <SelectItem value="courier">Courier</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Step 3: Customize Keychain */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-4">Step 3: Customize Your Keychain</h3>
          
          {/* Base Thickness */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Base Thickness</Label>
              <span className="text-sm text-primary font-medium">{baseThickness[0]}mm</span>
            </div>
            <Slider
              value={baseThickness}
              onValueChange={(value) => {
                setBaseThickness(value);
                if (onCustomizationChange) {
                  onCustomizationChange({
                    thickness: value[0],
                    holeX: holeX[0],
                    holeY: holeY[0],
                    hasHole,
                    previewColor,
                    texturePlacement,
                  });
                }
              }}
              min={1}
              max={10}
              step={0.5}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1mm</span>
              <span>10mm</span>
            </div>
          </div>

          {/* Text Height */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Text Height</Label>
              <span className="text-sm text-primary font-medium">{textHeight[0]}mm</span>
            </div>
            <Slider
              value={textHeight}
              onValueChange={setTextHeight}
              min={0.5}
              max={5}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0.5mm</span>
              <span>5mm</span>
            </div>
          </div>
        </div>

        {/* Step 4: Add Keychain Hole */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Step 4: Add Keychain Hole</h3>
          <div className="flex items-center justify-between mb-4">
            <Label htmlFor="hole-toggle" className="text-sm font-medium">Add Hole</Label>
            <Switch
              id="hole-toggle"
              checked={hasHole}
              onCheckedChange={(checked) => {
                setHasHole(checked);
                if (onCustomizationChange) {
                  onCustomizationChange({
                    thickness: baseThickness[0],
                    holeX: holeX[0],
                    holeY: holeY[0],
                    hasHole: checked,
                    previewColor,
                    texturePlacement,
                  });
                }
              }}
            />
          </div>

          {hasHole && (
            <>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Horizontal (X)</Label>
                  <span className="text-sm text-primary font-medium">{holeX[0]}%</span>
                </div>
                <Slider
                  value={holeX}
                  onValueChange={(value) => {
                    setHoleX(value);
                    if (onCustomizationChange) {
                      onCustomizationChange({
                        thickness: baseThickness[0],
                        holeX: value[0],
                        holeY: holeY[0],
                        hasHole,
                        previewColor,
                        texturePlacement,
                      });
                    }
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Vertical (Y)</Label>
                  <span className="text-sm text-primary font-medium">{holeY[0]}%</span>
                </div>
                <Slider
                  value={holeY}
                  onValueChange={(value) => {
                    setHoleY(value);
                    if (onCustomizationChange) {
                      onCustomizationChange({
                        thickness: baseThickness[0],
                        holeX: holeX[0],
                        holeY: value[0],
                        hasHole,
                        previewColor,
                        texturePlacement,
                      });
                    }
                  }}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Manual Input Boxes */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">X Position (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={holeX[0]}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(100, Number(e.target.value)));
                      setHoleX([value]);
                      if (onCustomizationChange) {
                        onCustomizationChange({
                          thickness: baseThickness[0],
                          holeX: value,
                          holeY: holeY[0],
                          hasHole,
                          previewColor,
                          texturePlacement,
                        });
                      }
                    }}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Y Position (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={holeY[0]}
                    onChange={(e) => {
                      const value = Math.max(0, Math.min(100, Number(e.target.value)));
                      setHoleY([value]);
                      if (onCustomizationChange) {
                        onCustomizationChange({
                          thickness: baseThickness[0],
                          holeX: holeX[0],
                          holeY: value,
                          hasHole,
                          previewColor,
                          texturePlacement,
                        });
                      }
                    }}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Step 5: Image Placement (only for images with background) */}
        {imageDataUrl && (
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Step 5: Where Image Appears</h3>
            <Select
              value={texturePlacement}
              onValueChange={(value: "front" | "back" | "front-back" | "all") => {
                setTexturePlacement(value);
                if (onCustomizationChange) {
                  onCustomizationChange({
                    thickness: baseThickness[0],
                    holeX: holeX[0],
                    holeY: holeY[0],
                    hasHole,
                    previewColor,
                    texturePlacement: value,
                  });
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="front">Front Side Only</SelectItem>
                <SelectItem value="back">Back Side Only</SelectItem>
                <SelectItem value="front-back">Front & Back Sides</SelectItem>
                <SelectItem value="all">All Sides</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">Choose which sides of the keychain show your image</p>
          </div>
        )}

        {/* Step 6: Preview Color */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Step {imageDataUrl ? '6' : '5'}: Preview Color</h3>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={previewColor}
              onChange={(e) => {
                setPreviewColor(e.target.value);
                if (onCustomizationChange) {
                  onCustomizationChange({
                    thickness: baseThickness[0],
                    holeX: holeX[0],
                    holeY: holeY[0],
                    hasHole,
                    previewColor: e.target.value,
                    texturePlacement,
                  });
                }
              }}
              className="w-12 h-12 rounded-lg cursor-pointer border-2 border-border"
            />
            <span className="text-sm text-muted-foreground font-mono">{previewColor}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Preview only - STL file has no color</p>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-primary hover:bg-primary/90 text-white font-semibold h-12"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate 3D Model"
          )}
        </Button>

        {/* Download Button */}
        {generatedStlId && getStorageUrl && (
          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-white font-semibold h-12"
          >
            <Download className="w-5 h-5 mr-2" />
            Download STL File
          </Button>
        )}
      </div>
    </div>
  );
};
