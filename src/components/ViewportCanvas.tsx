"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, OrbitControls, PerspectiveCamera, Sphere } from "@react-three/drei";
import { Suspense, useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import * as THREE from "three";

interface ViewportCanvasProps {
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
    texturePlacement?: "front" | "back" | "front-back" | "all";
  };
  onHolePositionChange?: (x: number, y: number) => void;
}

// Component for texture-based preview (immediate, fast)
function TexturePreview({ 
  imageDataUrl, 
  thickness, 
  holePosition, 
  hasHole,
  previewColor,
  textConfig,
  texturePlacement,
  onHolePositionChange
}: { 
  imageDataUrl: string;
  thickness: number;
  holePosition: { x: number; y: number };
  hasHole: boolean;
  previewColor: string;
  textConfig?: { text: string; fontSize: number; fontFamily: string; color: string };
  texturePlacement?: "front" | "back" | "front-back" | "all";
  onHolePositionChange?: (x: number, y: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const planeRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const shapeGeometryRef = useRef<THREE.ExtrudeGeometry | null>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [shapeGeometry, setShapeGeometry] = useState<THREE.ExtrudeGeometry | null>(null);
  const [hasTransparency, setHasTransparency] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  // Function to extract shape from image alpha channel
  const extractShapeFromImage = async (imageUrl: string): Promise<{ shape: THREE.Shape | null; bounds: { minX: number; maxX: number; minY: number; maxY: number; canvasWidth: number; canvasHeight: number } | null }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ shape: null, bounds: null });
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Check if image has transparency
        let hasAlpha = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            hasAlpha = true;
            break;
          }
        }

        if (!hasAlpha) {
          setHasTransparency(false);
          resolve({ shape: null, bounds: null });
          return;
        }

        setHasTransparency(true);

        // Create a binary mask from alpha channel with better threshold
        const mask: boolean[][] = [];
        for (let y = 0; y < canvas.height; y++) {
          mask[y] = [];
          for (let x = 0; x < canvas.width; x++) {
            const idx = (y * canvas.width + x) * 4;
            // Use a lower threshold to better separate object from background
            // Also check RGB values to catch semi-transparent pixels
            const alpha = data[idx + 3];
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            // Consider pixel opaque if alpha > 50 OR if RGB values suggest it's not background
            const isBackground = alpha < 50 || (r > 240 && g > 240 && b > 240 && alpha < 200);
            mask[y][x] = !isBackground;
          }
        }

        // Find the bounding box of non-transparent pixels
        let minX = canvas.width, maxX = 0, minY = canvas.height, maxY = 0;
        let hasValidPixels = false;
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            if (mask[y][x]) {
              hasValidPixels = true;
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
          }
        }
        
        // Validate bounding box
        if (!hasValidPixels || minX >= maxX || minY >= maxY) {
          setHasTransparency(false);
          resolve({ shape: null, bounds: null });
          return;
        }

        // Create a simplified outline by marching around the edge
        // For performance, we'll create a simplified shape
        const shape = new THREE.Shape();
        
        // Preserve aspect ratio - use same scaling logic as plane geometry
        const imageAspect = canvas.width / canvas.height;
        let scaleX: number, scaleY: number;
        const maxSize = 5; // Maximum dimension
        
        // Calculate plane dimensions (same as plane geometry)
        let planeWidth: number, planeHeight: number;
        if (imageAspect > 1) {
          // Landscape: width is larger
          planeWidth = maxSize;
          planeHeight = maxSize / imageAspect;
        } else {
          // Portrait: height is larger
          planeHeight = maxSize;
          planeWidth = maxSize * imageAspect;
        }
        
        // Calculate scale factors to match plane dimensions
        scaleX = planeWidth / canvas.width;
        scaleY = planeHeight / canvas.height;
        
        const offsetX = (canvas.width - (maxX + minX)) / 2;
        const offsetY = (canvas.height - (maxY + minY)) / 2;

        // Use contour tracing for better edge detection
        const points: [number, number][] = [];
        const step = Math.max(1, Math.floor(Math.min(canvas.width, canvas.height) / 200)); // More samples for smoother edges
        
        // Find edge points using contour tracing
        // Start from top-left corner of bounding box and trace clockwise
        const visited = new Set<string>();
        
        // Helper to check if point is on edge (has both opaque and transparent neighbors)
        const isEdgePoint = (x: number, y: number): boolean => {
          if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) return false;
          if (!mask[y][x]) return false;
          
          // Check neighbors
          const neighbors = [
            [x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
          ];
          
          let hasTransparentNeighbor = false;
          for (const [nx, ny] of neighbors) {
            if (nx < 0 || nx >= canvas.width || ny < 0 || ny >= canvas.height) {
              hasTransparentNeighbor = true;
              break;
            }
            if (!mask[ny][nx]) {
              hasTransparentNeighbor = true;
              break;
            }
          }
          
          return hasTransparentNeighbor;
        };
        
        // Trace contour starting from top-left
        let startX = minX;
        let startY = minY;
        
        // Find first edge point
        let foundStart = false;
        for (let y = minY; y <= maxY && !foundStart; y++) {
          for (let x = minX; x <= maxX && !foundStart; x++) {
            if (isEdgePoint(x, y)) {
              startX = x;
              startY = y;
              foundStart = true;
            }
          }
        }
        
        if (!foundStart) {
          // Fallback to simple edge detection
          for (let x = minX; x <= maxX; x += step) {
            for (let y = minY; y <= maxY; y++) {
              if (mask[y][x] && isEdgePoint(x, y)) {
                points.push([
                  (x - canvas.width / 2 + offsetX) * scaleX,
                  (canvas.height / 2 - y - offsetY) * scaleY
                ]);
                break;
              }
            }
          }
          for (let y = minY; y <= maxY; y += step) {
            for (let x = maxX; x >= minX; x--) {
              if (mask[y][x] && isEdgePoint(x, y)) {
                points.push([
                  (x - canvas.width / 2 + offsetX) * scaleX,
                  (canvas.height / 2 - y - offsetY) * scaleY
                ]);
                break;
              }
            }
          }
          for (let x = maxX; x >= minX; x -= step) {
            for (let y = maxY; y >= minY; y--) {
              if (mask[y][x] && isEdgePoint(x, y)) {
                points.push([
                  (x - canvas.width / 2 + offsetX) * scaleX,
                  (canvas.height / 2 - y - offsetY) * scaleY
                ]);
                break;
              }
            }
          }
          for (let y = maxY; y >= minY; y -= step) {
            for (let x = minX; x <= maxX; x++) {
              if (mask[y][x] && isEdgePoint(x, y)) {
                points.push([
                  (x - canvas.width / 2 + offsetX) * scaleX,
                  (canvas.height / 2 - y - offsetY) * scaleY
                ]);
                break;
              }
            }
          }
        } else {
          // Use marching squares-like algorithm for better contour
          let currentX = startX;
          let currentY = startY;
          const directions = [
            [0, -1], [1, -1], [1, 0], [1, 1],
            [0, 1], [-1, 1], [-1, 0], [-1, -1]
          ];
          
          do {
            const key = `${currentX},${currentY}`;
            if (!visited.has(key) && isEdgePoint(currentX, currentY)) {
              visited.add(key);
              points.push([
                (currentX - canvas.width / 2 + offsetX) * scaleX,
                (canvas.height / 2 - currentY - offsetY) * scaleY
              ]);
              
              // Find next edge point
              let foundNext = false;
              for (let i = 0; i < directions.length && !foundNext; i++) {
                const [dx, dy] = directions[i];
                const nextX = currentX + dx;
                const nextY = currentY + dy;
                if (nextX >= minX && nextX <= maxX && nextY >= minY && nextY <= maxY) {
                  if (isEdgePoint(nextX, nextY) && !visited.has(`${nextX},${nextY}`)) {
                    currentX = nextX;
                    currentY = nextY;
                    foundNext = true;
                  }
                }
              }
              if (!foundNext) break;
            } else {
              break;
            }
          } while (points.length < 1000 && (currentX !== startX || currentY !== startY || points.length === 0));
        }

        if (points.length > 2) {
          try {
            // Smooth the points using a simple averaging filter for smoother edges
            const smoothedPoints: [number, number][] = [];
            for (let i = 0; i < points.length; i++) {
              const prev = points[(i - 1 + points.length) % points.length];
              const curr = points[i];
              const next = points[(i + 1) % points.length];
              // Average with neighbors for smoothing (weighted: 0.25 prev, 0.5 curr, 0.25 next)
              smoothedPoints.push([
                prev[0] * 0.25 + curr[0] * 0.5 + next[0] * 0.25,
                prev[1] * 0.25 + curr[1] * 0.5 + next[1] * 0.25
              ]);
            }
            
            shape.moveTo(smoothedPoints[0][0], smoothedPoints[0][1]);
            for (let i = 1; i < smoothedPoints.length; i++) {
              shape.lineTo(smoothedPoints[i][0], smoothedPoints[i][1]);
            }
            shape.lineTo(smoothedPoints[0][0], smoothedPoints[0][1]); // Close the shape
            
            // Validate shape has valid area and reasonable size
            const shapePoints = shape.getPoints();
            if (shapePoints && shapePoints.length > 2) {
              // Check if shape has reasonable dimensions (not too small)
              let shapeWidth = 0, shapeHeight = 0;
              for (let i = 0; i < shapePoints.length; i++) {
                const p1 = shapePoints[i];
                const p2 = shapePoints[(i + 1) % shapePoints.length];
                shapeWidth = Math.max(shapeWidth, Math.abs(p1.x - p2.x));
                shapeHeight = Math.max(shapeHeight, Math.abs(p1.y - p2.y));
              }
              
              // Ensure shape is at least 10% of the canvas size
              const minSize = Math.min(planeWidth, planeHeight) * 0.1;
              if (shapeWidth < minSize && shapeHeight < minSize) {
                console.warn("Shape too small, using full canvas bounds");
                // Fallback to full canvas bounds
                const fullShape = new THREE.Shape();
                fullShape.moveTo(-planeWidth / 2, -planeHeight / 2);
                fullShape.lineTo(planeWidth / 2, -planeHeight / 2);
                fullShape.lineTo(planeWidth / 2, planeHeight / 2);
                fullShape.lineTo(-planeWidth / 2, planeHeight / 2);
                fullShape.lineTo(-planeWidth / 2, -planeHeight / 2);
                resolve({
                  shape: fullShape,
                  bounds: {
                    minX: 0,
                    maxX: canvas.width,
                    minY: 0,
                    maxY: canvas.height,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height
                  }
                });
              } else {
                resolve({
                  shape,
                  bounds: {
                    minX,
                    maxX,
                    minY,
                    maxY,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height
                  }
                });
              }
            } else {
              console.warn("Shape has insufficient points");
              resolve({ shape: null, bounds: null });
            }
          } catch (error) {
            console.error("Error creating shape:", error);
            resolve({ shape: null, bounds: null });
          }
        } else {
          console.warn("Not enough points to create shape:", points.length);
          resolve({ shape: null, bounds: null });
        }
      };
      img.onerror = () => resolve({ shape: null, bounds: null });
      img.src = imageUrl;
    });
  };

  useEffect(() => {
    if (imageDataUrl) {
      // Dispose previous texture and geometry
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (shapeGeometryRef.current) {
        shapeGeometryRef.current.dispose();
        shapeGeometryRef.current = null;
      }
      
      // Load texture
      const loader = new THREE.TextureLoader();
      loader.load(
        imageDataUrl,
        async (loadedTexture) => {
          // Configure texture settings
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.flipY = true; // Flip Y to match correct image orientation
          loadedTexture.needsUpdate = true;
          loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
          loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          
          console.log("Texture loaded successfully:", loadedTexture);
          textureRef.current = loadedTexture;
          setTexture(loadedTexture);
          setImageDimensions({
            width: loadedTexture.image.width,
            height: loadedTexture.image.height
          });

          // Extract shape from image if it has transparency
          // Use 3D printer approach: Extract 2D shape, then extrude it to create solid 3D object
          try {
            const shapeResult = await extractShapeFromImage(imageDataUrl);
            if (shapeResult.shape && shapeResult.bounds) {
              setHasTransparency(true); // Set transparency flag
              // Create proper 3D extrusion (like 3D printer layers)
              const extrudeSettings = {
                depth: thickness / 10, // Extrude upward to create thickness
                bevelEnabled: false,
              };
              const geometry = new THREE.ExtrudeGeometry(shapeResult.shape, extrudeSettings);
              
              // Center the geometry at origin (z=0 is the base, thickness extends upward)
              geometry.center();
              
              // Compute UVs for proper texture mapping on the extruded geometry
              geometry.computeBoundingBox();
              const box = geometry.boundingBox;
              if (box && shapeResult.bounds && texture && texture.image) {
                const bounds = shapeResult.bounds;
                const imgWidth = texture.image.width;
                const imgHeight = texture.image.height;
                
                // Calculate scale factors to match the shape bounds
                const imageAspect = imgWidth / imgHeight;
                const maxSize = 5;
                let planeWidth: number, planeHeight: number;
                if (imageAspect > 1) {
                  planeWidth = maxSize;
                  planeHeight = maxSize / imageAspect;
                } else {
                  planeHeight = maxSize;
                  planeWidth = maxSize * imageAspect;
                }
                
                const scaleX = planeWidth / imgWidth;
                const scaleY = planeHeight / imgHeight;
                
                // Update UVs for proper texture mapping
                const uvAttribute = geometry.getAttribute('uv');
                if (uvAttribute) {
                  const uvs = uvAttribute.array as Float32Array;
                  const positions = geometry.getAttribute('position').array as Float32Array;
                  
                  for (let i = 0; i < uvs.length; i += 2) {
                    const vertexIndex = i / 2;
                    const x = positions[vertexIndex * 3];
                    const y = positions[vertexIndex * 3 + 1];
                    const z = positions[vertexIndex * 3 + 2];
                    
                    // Check if this vertex is on the top face (front) of the extrusion
                    const isTopFace = Math.abs(z - thickness / 20) < 0.01;
                    
                    if (isTopFace) {
                      // Map texture coordinates for top face
                      const imgX = ((x / scaleX) + imgWidth / 2);
                      const imgY = (imgHeight / 2 - (y / scaleY));
                      
                      uvs[i] = Math.max(0, Math.min(1, imgX / imgWidth));
                      uvs[i + 1] = Math.max(0, Math.min(1, imgY / imgHeight));
                    }
                  }
                  uvAttribute.needsUpdate = true;
                }
              }
              
              // Store for rendering
              shapeGeometryRef.current = geometry;
              setShapeGeometry(geometry);
              console.log("3D extruded geometry created from image outline");
            } else {
              setHasTransparency(false); // No transparency detected
              setShapeGeometry(null);
              console.log("No shape extracted from image - treating as regular image");
            }
          } catch (error) {
            console.error("Error extracting shape:", error);
            setHasTransparency(false); // Fallback to regular image
            setShapeGeometry(null);
          }
        },
        (progress) => {
          if (progress.lengthComputable) {
            console.log("Texture loading progress:", (progress.loaded / progress.total * 100) + "%");
          }
        },
        (error) => {
          console.error("Error loading texture:", error);
          textureRef.current = null;
          setTexture(null);
          setShapeGeometry(null);
        }
      );
    } else {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (shapeGeometryRef.current) {
        shapeGeometryRef.current.dispose();
        shapeGeometryRef.current = null;
      }
      setTexture(null);
      setShapeGeometry(null);
      setHasTransparency(false);
    }
    
    // Cleanup function
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
        textureRef.current = null;
      }
      if (shapeGeometryRef.current) {
        shapeGeometryRef.current.dispose();
        shapeGeometryRef.current = null;
      }
    };
  }, [imageDataUrl]);

  // Update shape geometry when thickness or texturePlacement changes (3D printer approach)
  useEffect(() => {
    if (hasTransparency && imageDataUrl && texture) {
      // Recreate extruded geometry with new thickness
      extractShapeFromImage(imageDataUrl).then((shapeResult) => {
        if (shapeResult.shape && shapeResult.bounds && texture) {
          if (shapeGeometryRef.current) {
            shapeGeometryRef.current.dispose();
          }
          const extrudeSettings = {
            depth: thickness / 10, // Extrude upward
            bevelEnabled: false,
          };
          const geometry = new THREE.ExtrudeGeometry(shapeResult.shape, extrudeSettings);
          geometry.center(); // Center at origin
          
          shapeGeometryRef.current = geometry;
          setShapeGeometry(geometry);
        }
      });
    }
  }, [thickness, hasTransparency, imageDataUrl, texture, texturePlacement]);

  // Real-time thickness update
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.scale.z = thickness / 5; // Normalize to reasonable scale
    }
  });

  // Calculate hole position in 3D space (normalize from percentage)
  const holeX3D = (holePosition.x / 50 - 1) * 2.5; // -2.5 to 2.5
  const holeY3D = (holePosition.y / 50 - 1) * 2.5;

  // Removed click-and-drag functionality - using input boxes instead

  // Create text texture if text is provided
  const [textTexture, setTextTexture] = useState<THREE.CanvasTexture | null>(null);

  useEffect(() => {
    if (textConfig && textConfig.text) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `${textConfig.fontSize * 2}px ${textConfig.fontFamily}`;
        ctx.fillStyle = textConfig.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(textConfig.text, 256, 64);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      setTextTexture(texture);
    } else {
      setTextTexture(null);
    }
  }, [textConfig]);

  return (
    <>
      {/* Main keychain body - 3D printer approach: Create 2D shape, then extrude it */}
      {shapeGeometry && hasTransparency && texture ? (
        // Transparent images: Use extracted shape, extrude it to create solid 3D object
        // Ensure geometry persists - check if shapeGeometry exists before rendering
        shapeGeometry ? (
          <mesh 
            ref={planeRef}
            position={[0, 0, 0]}
            geometry={shapeGeometry}
            key={`transparent-${shapeGeometry.uuid}-${thickness}`}
          >
            <meshStandardMaterial
              map={texture}
              color={undefined}
              roughness={0.4}
              metalness={0.3}
              side={THREE.DoubleSide}
              transparent={false}
            />
          </mesh>
        ) : null
      ) : texture ? (
        // Regular images: Create rectangular shape from image bounds, then extrude it (3D printer style)
        (() => {
          const imgWidth = texture.image.width;
          const imgHeight = texture.image.height;
          const aspect = imgWidth / imgHeight;
          const maxSize = 5;
          
          let boxWidth: number, boxHeight: number;
          if (aspect > 1) {
            boxWidth = maxSize;
            boxHeight = maxSize / aspect;
          } else {
            boxHeight = maxSize;
            boxWidth = maxSize * aspect;
          }
          
          // Create a rectangular shape (like 3D printer base layer)
          const rectShape = new THREE.Shape();
          rectShape.moveTo(-boxWidth / 2, -boxHeight / 2);
          rectShape.lineTo(boxWidth / 2, -boxHeight / 2);
          rectShape.lineTo(boxWidth / 2, boxHeight / 2);
          rectShape.lineTo(-boxWidth / 2, boxHeight / 2);
          rectShape.lineTo(-boxWidth / 2, -boxHeight / 2);
          
          // Extrude the shape to create solid 3D object (like 3D printer layers)
          const extrudeSettings = {
            depth: thickness / 10,
            bevelEnabled: false,
          };
          const extrudedGeometry = new THREE.ExtrudeGeometry(rectShape, extrudeSettings);
          extrudedGeometry.center();
          
          const placement = texturePlacement || "front-back";
          
          // Calculate the half-thickness (extruded geometry extends from -halfThickness to +halfThickness)
          const halfThickness = thickness / 20;
          // Use a larger offset to ensure texture planes are always visible above the geometry
          // Scale offset with thickness to prevent z-fighting at all thickness levels
          const textureOffset = Math.max(0.01, thickness / 1000);
          
          // Handle different texture placement options with real-time updates
          if (placement === "front") {
            // Front only - show texture on front face, preview color elsewhere
            return (
              <>
                {/* Extruded geometry with preview color */}
                <mesh 
                  ref={planeRef}
                  position={[0, 0, 0]}
                  geometry={extrudedGeometry}
                  renderOrder={0}
                  key={`extruded-base-${texture.uuid}-${thickness}-${placement}`}
                >
                  <meshStandardMaterial
                    color={previewColor}
                    roughness={0.4}
                    metalness={0.3}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                
                {/* Front face plane with texture - positioned above the face to prevent being covered */}
                <mesh 
                  position={[0, 0, halfThickness + textureOffset]}
                  renderOrder={1}
                  key={`front-plane-${texture.uuid}-${placement}`}
                >
                  <planeGeometry args={[boxWidth, boxHeight]} />
                  <meshStandardMaterial
                    map={texture}
                    color={undefined}
                    roughness={0.4}
                    metalness={0.3}
                    side={THREE.FrontSide}
                    depthWrite={false}
                    depthTest={true}
                  />
                </mesh>
              </>
            );
          } else if (placement === "back") {
            // Back only - show texture on back face, preview color elsewhere
            return (
              <>
                {/* Extruded geometry with preview color */}
                <mesh 
                  ref={planeRef}
                  position={[0, 0, 0]}
                  geometry={extrudedGeometry}
                  renderOrder={0}
                  key={`extruded-base-${texture.uuid}-${thickness}-${placement}`}
                >
                  <meshStandardMaterial
                    color={previewColor}
                    roughness={0.4}
                    metalness={0.3}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                
                {/* Back face plane with texture - positioned below the face to prevent being covered */}
                <mesh 
                  position={[0, 0, -halfThickness - textureOffset]}
                  renderOrder={1}
                  key={`back-plane-${texture.uuid}-${placement}`}
                >
                  <planeGeometry args={[boxWidth, boxHeight]} />
                  <meshStandardMaterial
                    map={texture}
                    color={undefined}
                    roughness={0.4}
                    metalness={0.3}
                    side={THREE.BackSide}
                    depthWrite={false}
                    depthTest={true}
                  />
                </mesh>
              </>
            );
          } else if (placement === "all") {
            // All sides - texture everywhere (no separate planes needed)
            return (
              <mesh 
                ref={planeRef}
                position={[0, 0, 0]}
                geometry={extrudedGeometry}
                key={`extruded-${texture.uuid}-${thickness}-${placement}`}
              >
                <meshStandardMaterial
                  map={texture}
                  color={undefined}
                  roughness={0.4}
                  metalness={0.3}
                  side={THREE.DoubleSide}
                />
              </mesh>
            );
          } else {
            // Front & Back - texture on both front and back faces - full size
            return (
              <>
                {/* Extruded geometry with preview color for sides */}
                <mesh 
                  ref={planeRef}
                  position={[0, 0, 0]}
                  geometry={extrudedGeometry}
                  key={`extruded-base-${texture.uuid}-${thickness}-${placement}`}
                >
                  <meshStandardMaterial
                    color={previewColor}
                    roughness={0.4}
                    metalness={0.3}
                    side={THREE.DoubleSide}
                  />
                </mesh>
                
                {/* Front face plane with texture - positioned above the face to prevent being covered */}
                <mesh 
                  position={[0, 0, halfThickness + textureOffset]}
                  renderOrder={1}
                  key={`front-overlay-${texture.uuid}-${placement}`}
                >
                  <planeGeometry args={[boxWidth, boxHeight]} />
                  <meshStandardMaterial
                    map={texture}
                    color={undefined}
                    roughness={0.4}
                    metalness={0.3}
                    side={THREE.FrontSide}
                    depthWrite={false}
                    depthTest={true}
                  />
                </mesh>
                
                {/* Back face plane with texture - positioned below the face to prevent being covered */}
                <mesh 
                  position={[0, 0, -halfThickness - textureOffset]}
                  renderOrder={1}
                  key={`back-overlay-${texture.uuid}-${placement}`}
                >
                  <planeGeometry args={[boxWidth, boxHeight]} />
                  <meshStandardMaterial
                    map={texture}
                    color={undefined}
                    roughness={0.4}
                    metalness={0.3}
                    side={THREE.BackSide}
                    depthWrite={false}
                    depthTest={true}
                  />
                </mesh>
              </>
            );
          }
        })()
      ) : (
        // Preview color only - create rectangular shape and extrude it
        (() => {
          const rectShape = new THREE.Shape();
          rectShape.moveTo(-2.5, -2.5);
          rectShape.lineTo(2.5, -2.5);
          rectShape.lineTo(2.5, 2.5);
          rectShape.lineTo(-2.5, 2.5);
          rectShape.lineTo(-2.5, -2.5);
          
          const extrudeSettings = {
            depth: thickness / 10,
            bevelEnabled: false,
          };
          const extrudedGeometry = new THREE.ExtrudeGeometry(rectShape, extrudeSettings);
          extrudedGeometry.center();
          
          return (
            <mesh 
              ref={planeRef}
              position={[0, 0, 0]}
              geometry={extrudedGeometry}
              key={`extruded-preview-${thickness}`}
            >
              <meshStandardMaterial
                color={previewColor}
                roughness={0.4}
                metalness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          );
        })()
      )}
      


      {/* Text overlay */}
      {textTexture && textConfig && textConfig.text && (
        <mesh position={[0, 0, (thickness / 20) + 0.03]}>
          <planeGeometry args={[2, 0.5]} />
          <meshBasicMaterial map={textTexture} transparent depthWrite={false} />
        </mesh>
      )}

      {/* Keychain hole indicator */}
      {hasHole && (
        <>
          <Sphere
            args={[0.15, 16, 16]}
            position={[holeX3D, holeY3D, (thickness / 20) + 0.15]}
          >
            <meshStandardMaterial 
              color="#FFD700"
              emissive="#FFD700"
              emissiveIntensity={0.3}
            />
          </Sphere>
          <mesh position={[holeX3D, holeY3D, (thickness / 20) + 0.02]}>
            <torusGeometry args={[0.2, 0.05, 8, 32]} />
            <meshStandardMaterial color="#C0C0C0" metalness={0.8} roughness={0.2} />
          </mesh>
        </>
      )}
    </>
  );
}

// Component to load and display STL model (accurate, slower)
function StlModel({ url }: { url: string }) {
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    const loader = new STLLoader();
    loader.load(
      url,
      (loadedGeometry) => {
        // Compute bounding box to scale appropriately
        loadedGeometry.computeBoundingBox();
        const box = loadedGeometry.boundingBox;
        if (box) {
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = maxDim > 0 ? 10 / maxDim : 1; // Scale to fit in a 10-unit space
          
          // Apply scale to geometry
          loadedGeometry.scale(scale, scale, scale);
        }
        
        // Center the geometry after scaling
        loadedGeometry.center();
        setGeometry(loadedGeometry);
      },
      undefined,
      (error) => {
        console.error("Error loading STL:", error);
      }
    );
  }, [url]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color="#40E0D0" metalness={0.3} roughness={0.4} />
    </mesh>
  );
}

export const ViewportCanvas = ({ 
  stlStorageId, 
  imageDataUrl, 
  customization,
  onHolePositionChange
}: ViewportCanvasProps) => {
  const stlUrl = useQuery(
    api.storage.getStorageUrl,
    stlStorageId ? { storageId: stlStorageId } : "skip"
  );

  // Show texture preview if image is uploaded, STL if available
  const showTexturePreview = imageDataUrl && !stlUrl;
  const showStlModel = stlUrl;

  const textConfig = customization.text ? {
    text: customization.text,
    fontSize: customization.fontSize || 24,
    fontFamily: customization.fontFamily || "Arial",
    color: customization.textColor || "#000000"
  } : undefined;

  return (
    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-border overflow-hidden relative">
      <Canvas>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 5, 10]} />
          <OrbitControls 
            enablePan={true} 
            enableZoom={true} 
            enableRotate={true}
            enableDamping={true}
            dampingFactor={0.05}
          />
          
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <directionalLight position={[-10, -10, -5]} intensity={0.5} />
          
          {/* Grid floor */}
          <Grid
            args={[20, 20]}
            cellSize={1}
            cellThickness={0.5}
            cellColor="#6B7280"
            sectionSize={5}
            sectionThickness={1}
            sectionColor="#40E0D0"
            fadeDistance={30}
            fadeStrength={1}
            followCamera={false}
            infiniteGrid={true}
          />

          {/* Texture Preview (immediate, fast) */}
          {showTexturePreview && (
            <TexturePreview
              imageDataUrl={imageDataUrl}
              thickness={customization.thickness}
              holePosition={{ x: customization.holeX, y: customization.holeY }}
              hasHole={customization.hasHole}
              previewColor={customization.previewColor}
              textConfig={textConfig}
              texturePlacement={customization.texturePlacement}
              onHolePositionChange={onHolePositionChange}
            />
          )}

          {/* STL Model (accurate, after generation) */}
          {showStlModel && (
            <Suspense fallback={null}>
              <StlModel url={stlUrl} />
            </Suspense>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
};
