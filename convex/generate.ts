"use node";

// Provide DOMParser globally for SVGLoader BEFORE importing it
import { DOMParser } from "@xmldom/xmldom";
(global as any).DOMParser = DOMParser;

import { action } from "./_generated/server";
import { v } from "convex/values";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
// CSG removed - using manual geometry manipulation instead
import potrace from "potrace";
import { promisify } from "util";
import Jimp from "jimp";

const trace = promisify(potrace.trace);

// Action to generate STL from image
export const createStl = action({
  args: {
    imageStorageId: v.id("_storage"),
    options: v.object({
      thickness: v.number(),
      textHeight: v.number(),
      text: v.optional(v.string()),
      fontStyle: v.optional(v.string()),
      hasHole: v.boolean(),
      holeX: v.optional(v.number()),
      holeY: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    // 1. Get the image file from storage
    const imageBlob = await ctx.storage.get(args.imageStorageId);
    if (!imageBlob) {
      throw new Error("Image not found in storage");
    }

    // 2. Convert Blob to Buffer for jimp preprocessing
    const arrayBuffer = await imageBlob.arrayBuffer();
    let imageBuffer = Buffer.from(arrayBuffer);

    // 3. Pre-process image with jimp to convert to 1-bit black and white for potrace
    // This ensures potrace traces the actual shape, not the entire rectangular border
    let imageWidth = 0;
    let imageHeight = 0;
    let hasTransparency = false;
    
    try {
      const jimpImage = await Jimp.read(imageBuffer);
      imageWidth = jimpImage.bitmap.width;
      imageHeight = jimpImage.bitmap.height;
      
      // First, check if image has transparency
      jimpImage.scan(0, 0, imageWidth, imageHeight, function (x, y, idx) {
        if (this.bitmap.data[idx + 3] < 255) {
          hasTransparency = true;
        }
      });
      
      // Convert to grayscale first for better edge detection
      jimpImage.greyscale();
      
      // Scan every pixel and convert to 1-bit (black for foreground, white for background)
      jimpImage.scan(0, 0, jimpImage.bitmap.width, jimpImage.bitmap.height, function (x, y, idx) {
        // Get RGBA values
        const alpha = this.bitmap.data[idx + 3];
        const gray = this.bitmap.data[idx]; // Grayscale value (R=G=B after greyscale())
        
        if (hasTransparency) {
          // For transparent images: Trace the OBJECT, carve the BACKGROUND
          // Potrace traces BLACK shapes, so object should be BLACK (traced, becomes raised 3D)
          // Background should be WHITE (not traced, becomes carved/empty)
          if (alpha > 128) {
            // Opaque pixel (object like Pikachu) → solid BLACK (traced, becomes raised 3D shape)
            this.bitmap.data[idx + 0] = 0;   // R (black)
            this.bitmap.data[idx + 1] = 0;   // G
            this.bitmap.data[idx + 2] = 0;   // B
            this.bitmap.data[idx + 3] = 255; // A
          } else {
            // Transparent pixel (background) → solid WHITE (not traced, becomes carved/empty)
            this.bitmap.data[idx + 0] = 255; // R (white)
            this.bitmap.data[idx + 1] = 255; // G
            this.bitmap.data[idx + 2] = 255; // B
            this.bitmap.data[idx + 3] = 255; // A
          }
        } else {
          // For images with backgrounds: Trace the FOREGROUND, carve the BACKGROUND
          // Dark pixels (foreground/object) → BLACK (traced, becomes raised 3D)
          // Light pixels (background) → WHITE (not traced, becomes carved/empty)
          const threshold = 180;
          if (gray < threshold) {
            // Dark pixel (foreground/object like Pikachu) → solid BLACK (traced, raised)
            this.bitmap.data[idx + 0] = 0;   // R (black)
            this.bitmap.data[idx + 1] = 0;   // G
            this.bitmap.data[idx + 2] = 0;   // B
            this.bitmap.data[idx + 3] = 255; // A
          } else {
            // Light pixel (background) → solid WHITE (not traced, carved)
            this.bitmap.data[idx + 0] = 255; // R (white)
            this.bitmap.data[idx + 1] = 255; // G
            this.bitmap.data[idx + 2] = 255; // B
            this.bitmap.data[idx + 3] = 255; // A
          }
        }
      });
      
      // Get the processed buffer from jimp
      const processedBuffer = await jimpImage.getBufferAsync(Jimp.MIME_PNG);
      imageBuffer = Buffer.from(processedBuffer);
      console.log(`Image preprocessed: ${hasTransparency ? 'transparent' : 'solid background'}, size: ${imageWidth}x${imageHeight}`);
    } catch (jimpError) {
      // If jimp fails, log error and continue with original buffer
      console.warn("Jimp preprocessing failed, using original image:", jimpError);
      // Continue with original imageBuffer
    }

    // 4. Trace the processed image to SVG using potrace
    const svgString = await trace(imageBuffer, {
      color: "black",
      background: "white",
      threshold: 128,
      turdSize: 2, // Remove small artifacts
      optCurve: true, // Optimize curves
      optTolerance: 0.4, // Curve optimization tolerance
    });
    
    console.log(`SVG generated: ${svgString.length} characters`);
    // Log first 500 chars of SVG to debug
    console.log(`SVG preview: ${svgString.substring(0, 500)}...`);

    // 5. Parse SVG and create 3D geometry
    const loader = new SVGLoader();
    const svgData = loader.parse(svgString);

    console.log(`SVG parsed: ${svgData.paths?.length || 0} paths found`);

    // Create a group to hold all shapes
    const group = new THREE.Group();

    // Calculate image aspect ratio and dimensions for base plate
    // Use the actual image dimensions from jimp processing
    let svgWidth = imageWidth || 100;
    let svgHeight = imageHeight || 100;
    
    // Try to get SVG viewBox if available (SVGLoader may provide it differently)
    if (svgData.xml) {
      try {
        const svgElement = svgData.xml.documentElement;
        if (svgElement) {
          const viewBox = svgElement.getAttribute('viewBox');
          if (viewBox) {
            const [, , width, height] = viewBox.split(/\s+/).map(Number);
            if (width && height) {
              svgWidth = width;
              svgHeight = height;
            }
          } else {
            const width = svgElement.getAttribute('width');
            const height = svgElement.getAttribute('height');
            if (width && height) {
              svgWidth = parseFloat(width) || svgWidth;
              svgHeight = parseFloat(height) || svgHeight;
            }
          }
        }
      } catch (e) {
        // Fall back to image dimensions
        console.log("Could not parse SVG dimensions, using image dimensions");
      }
    }
    
    // Normalize to a reasonable size (max 50mm in largest dimension)
    const maxSize = 50; // 50mm max dimension
    const aspectRatio = svgWidth / svgHeight;
    let baseWidth: number, baseHeight: number;
    
    if (aspectRatio > 1) {
      // Landscape
      baseWidth = maxSize;
      baseHeight = maxSize / aspectRatio;
    } else {
      // Portrait or square
      baseHeight = maxSize;
      baseWidth = maxSize * aspectRatio;
    }
    
    console.log(`Base plate dimensions: ${baseWidth.toFixed(2)}mm x ${baseHeight.toFixed(2)}mm`);

    // STEP 1: Create base plate (always present for all image types)
    // This ensures white backgrounds and transparent images have a solid base
    const basePlateShape = new THREE.Shape();
    basePlateShape.moveTo(-baseWidth / 2, -baseHeight / 2);
    basePlateShape.lineTo(baseWidth / 2, -baseHeight / 2);
    basePlateShape.lineTo(baseWidth / 2, baseHeight / 2);
    basePlateShape.lineTo(-baseWidth / 2, baseHeight / 2);
    basePlateShape.lineTo(-baseWidth / 2, -baseHeight / 2);
    
    const basePlateExtrudeSettings = {
      depth: args.options.thickness, // Base plate uses full thickness
      bevelEnabled: false,
    };
    
    const basePlateGeometry = new THREE.ExtrudeGeometry(basePlateShape, basePlateExtrudeSettings);
    basePlateGeometry.center(); // Center at origin
    const basePlateMesh = new THREE.Mesh(basePlateGeometry);
    group.add(basePlateMesh);
    console.log(`Base plate created with thickness: ${args.options.thickness}mm`);

    // STEP 2: Process SVG paths to create elevated shapes on top of base plate
    if (!svgData.paths || svgData.paths.length === 0) {
      console.warn("No paths found in SVG - only base plate will be created");
    } else {
      let totalShapes = 0;
      const elevationHeight = args.options.thickness * 0.5; // Elevate shapes by 50% of thickness
      
      for (const path of svgData.paths) {
        // SVGLoader.createShapes creates filled shapes from SVG paths
        const shapes = SVGLoader.createShapes(path);
        if (!shapes || shapes.length === 0) {
          console.warn("No shapes created from SVG path");
          continue;
        }
        totalShapes += shapes.length;
        
        for (const shape of shapes) {
          // Create extrude geometry for elevated shape
          // The elevated shape should be thinner than the base plate
          const elevatedExtrudeSettings = {
            depth: elevationHeight, // Elevated shape height (50% of thickness)
            bevelEnabled: false,
            steps: 1,
          };
          
          try {
            const geometry = new THREE.ExtrudeGeometry(shape, elevatedExtrudeSettings);
            
            // Validate geometry has vertices
            const positions = geometry.getAttribute('position');
            if (!positions || positions.count === 0) {
              console.warn("Extruded geometry has no vertices, skipping");
              continue;
            }
            
            // Center the geometry horizontally, but elevate it vertically
            geometry.center();
            // Translate upward so it sits on top of the base plate
            geometry.translate(0, 0, args.options.thickness / 2 + elevationHeight / 2);
            
            // Log geometry bounds for debugging
            geometry.computeBoundingBox();
            const box = geometry.boundingBox;
            if (box) {
              const size = box.getSize(new THREE.Vector3());
              const center = box.getCenter(new THREE.Vector3());
              console.log(`Elevated shape: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}, center Z: ${center.z.toFixed(2)}`);
            }
            
            const mesh = new THREE.Mesh(geometry);
            group.add(mesh);
          } catch (extrudeError) {
            console.error("Error extruding shape:", extrudeError);
            continue;
          }
        }
      }

      console.log(`Created ${totalShapes} elevated shapes on top of base plate`);
    }

    if (group.children.length === 0) {
      throw new Error("No geometry created. Please try a different image.");
    }

    // 6. Add text if provided
    if (args.options.text) {
      // Note: TextGeometry requires fonts. For now, we'll skip text or use a simple approach
      // In production, you'd need to load a font file (e.g., from Convex storage)
      // For now, we'll create a placeholder that can be extended
      console.log("Text feature requires font loading - skipping for now");
    }

    // 7. Combine all meshes into one
    let finalMesh: THREE.Mesh;
    if (group.children.length === 0) {
      throw new Error("No geometry created from image");
    } else if (group.children.length === 1) {
      finalMesh = group.children[0] as THREE.Mesh;
    } else {
      // Merge multiple meshes manually
      const geometries = group.children.map((child) => (child as THREE.Mesh).geometry);
      const mergedGeometry = new THREE.BufferGeometry();
      
      // Combine all geometries into one
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      let vertexOffset = 0;
      
      for (const geometry of geometries) {
        const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
        const norm = geometry.getAttribute("normal") as THREE.BufferAttribute | null;
        const uv = geometry.getAttribute("uv") as THREE.BufferAttribute | null;
        
        if (pos) {
          const posArray = pos.array as Float32Array;
          for (let i = 0; i < pos.count; i++) {
            const i3 = i * 3;
            positions.push(posArray[i3], posArray[i3 + 1], posArray[i3 + 2]);
          }
        }
        
        if (norm) {
          const normArray = norm.array as Float32Array;
          for (let i = 0; i < norm.count; i++) {
            const i3 = i * 3;
            normals.push(normArray[i3], normArray[i3 + 1], normArray[i3 + 2]);
          }
        }
        
        if (uv) {
          const uvArray = uv.array as Float32Array;
          for (let i = 0; i < uv.count; i++) {
            const i2 = i * 2;
            uvs.push(uvArray[i2], uvArray[i2 + 1]);
          }
        }
        
        // Handle indices - offset them by current vertex count
        const index = geometry.getIndex();
        if (index) {
          const indexArray = index.array as Uint32Array | Uint16Array;
          for (let i = 0; i < index.count; i++) {
            indices.push(indexArray[i] + vertexOffset);
          }
        } else {
          // If no index, create sequential indices
          for (let i = 0; i < (pos ? pos.count : 0); i++) {
            indices.push(vertexOffset + i);
          }
        }
        
        vertexOffset += pos ? pos.count : 0;
      }
      
      mergedGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      if (normals.length > 0) {
        mergedGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      }
      if (uvs.length > 0) {
        mergedGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      }
      if (indices.length > 0) {
        mergedGeometry.setIndex(indices);
      }
      
      mergedGeometry.computeBoundingBox();
      finalMesh = new THREE.Mesh(mergedGeometry);
    }

    // 8. Add keychain hole if requested
    // Create a proper circular hole by removing vertices inside radius and adding circular perimeter
    if (args.options.hasHole) {
      const bounds = new THREE.Box3().setFromObject(finalMesh);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());

      // Calculate hole position (holeX and holeY are percentages)
      const holeX = args.options.holeX ?? 50;
      const holeY = args.options.holeY ?? 50;
      const holePosition = new THREE.Vector3(
        center.x + (size.x * (holeX - 50)) / 50,
        center.y + (size.y * (holeY - 50)) / 50,
        center.z
      );

      const holeRadius = Math.min(size.x, size.y) * 0.08; // 8% of smallest dimension
      const minHoleRadius = 1.5; // Minimum 1.5mm
      const actualHoleRadius = Math.max(holeRadius, minHoleRadius);
      
      console.log(`Creating circular hole at (${holePosition.x.toFixed(2)}, ${holePosition.y.toFixed(2)}), radius: ${actualHoleRadius.toFixed(2)}`);
      
      const geometry = finalMesh.geometry;
      const positions = geometry.getAttribute('position');
      const indices = geometry.getIndex();
      
      if (positions && indices) {
        // Create new arrays for geometry with circular hole
        const newPositions: number[] = [];
        const newNormals: number[] = [];
        const newUvs: number[] = [];
        const newIndices: number[] = [];
        const vertexMap = new Map<number, number>();
        
        const posArray = positions.array as Float32Array;
        const normals = geometry.getAttribute('normal');
        const uvs = geometry.getAttribute('uv');
        const normArray = normals ? (normals.array as Float32Array) : null;
        const uvArray = uvs ? (uvs.array as Float32Array) : null;
        const indexArray = indices.array as Uint32Array | Uint16Array;
        
        // Get Z bounds to create hole through entire thickness
        let minZ = Infinity, maxZ = -Infinity;
        for (let i = 0; i < positions.count; i++) {
          const z = posArray[i * 3 + 2];
          minZ = Math.min(minZ, z);
          maxZ = Math.max(maxZ, z);
        }
        
        // Step 1: Filter vertices - keep only those outside the cylinder
        let newVertexIndex = 0;
        for (let i = 0; i < positions.count; i++) {
          const x = posArray[i * 3];
          const y = posArray[i * 3 + 1];
          const z = posArray[i * 3 + 2];
          
          // Check if vertex is inside the cylinder (hole)
          const dx = x - holePosition.x;
          const dy = y - holePosition.y;
          const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
          
          // Keep vertex if it's outside the cylinder radius
          if (distanceFromCenter > actualHoleRadius) {
            vertexMap.set(i, newVertexIndex);
            newPositions.push(x, y, z);
            if (normArray) {
              newNormals.push(normArray[i * 3], normArray[i * 3 + 1], normArray[i * 3 + 2]);
            }
            if (uvArray) {
              newUvs.push(uvArray[i * 2], uvArray[i * 2 + 1]);
            }
            newVertexIndex++;
          }
        }
        
        // Step 2: Create circular hole perimeter vertices
        // Create vertices around the circle at top and bottom faces
        const holeSegments = 32; // Number of segments for smooth circle
        const topZ = maxZ;
        const bottomZ = minZ;
        const holeStartIndex = newVertexIndex;
        
        // Top circle vertices
        for (let i = 0; i < holeSegments; i++) {
          const angle = (i / holeSegments) * Math.PI * 2;
          const x = holePosition.x + actualHoleRadius * Math.cos(angle);
          const y = holePosition.y + actualHoleRadius * Math.sin(angle);
          newPositions.push(x, y, topZ);
          // Normal points outward from center
          const normalX = Math.cos(angle);
          const normalY = Math.sin(angle);
          newNormals.push(normalX, normalY, 0);
          // UV mapping (can be approximate)
          newUvs.push(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
        }
        
        // Bottom circle vertices
        for (let i = 0; i < holeSegments; i++) {
          const angle = (i / holeSegments) * Math.PI * 2;
          const x = holePosition.x + actualHoleRadius * Math.cos(angle);
          const y = holePosition.y + actualHoleRadius * Math.sin(angle);
          newPositions.push(x, y, bottomZ);
          // Normal points outward from center
          const normalX = Math.cos(angle);
          const normalY = Math.sin(angle);
          newNormals.push(normalX, normalY, 0);
          // UV mapping
          newUvs.push(0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle));
        }
        
        // Step 3: Rebuild indices, skipping triangles that intersect the hole
        for (let i = 0; i < indexArray.length; i += 3) {
          const i0 = indexArray[i];
          const i1 = indexArray[i + 1];
          const i2 = indexArray[i + 2];
          
          // Check if triangle is completely outside the hole
          const v0x = posArray[i0 * 3];
          const v0y = posArray[i0 * 3 + 1];
          const v1x = posArray[i1 * 3];
          const v1y = posArray[i1 * 3 + 1];
          const v2x = posArray[i2 * 3];
          const v2y = posArray[i2 * 3 + 1];
          
          const d0 = Math.sqrt((v0x - holePosition.x) ** 2 + (v0y - holePosition.y) ** 2);
          const d1 = Math.sqrt((v1x - holePosition.x) ** 2 + (v1y - holePosition.y) ** 2);
          const d2 = Math.sqrt((v2x - holePosition.x) ** 2 + (v2y - holePosition.y) ** 2);
          
          // Only keep triangle if all vertices are outside the hole
          if (d0 > actualHoleRadius && d1 > actualHoleRadius && d2 > actualHoleRadius) {
            if (vertexMap.has(i0) && vertexMap.has(i1) && vertexMap.has(i2)) {
              const v0 = vertexMap.get(i0)!;
              const v1 = vertexMap.get(i1)!;
              const v2 = vertexMap.get(i2)!;
              
              if (v0 !== v1 && v1 !== v2 && v0 !== v2) {
                newIndices.push(v0, v1, v2);
              }
            }
          }
        }
        
        // Step 4: Add hole wall geometry (cylinder sides)
        // Connect top and bottom circle vertices to form the hole wall
        for (let i = 0; i < holeSegments; i++) {
          const top0 = holeStartIndex + i;
          const top1 = holeStartIndex + ((i + 1) % holeSegments);
          const bottom0 = holeStartIndex + holeSegments + i;
          const bottom1 = holeStartIndex + holeSegments + ((i + 1) % holeSegments);
          
          // Create two triangles for each segment of the cylinder wall
          // Triangle 1: top0, top1, bottom0
          newIndices.push(top0, top1, bottom0);
          // Triangle 2: top1, bottom1, bottom0
          newIndices.push(top1, bottom1, bottom0);
        }
        
        // Step 5: Add hole top and bottom caps (optional - creates closed hole)
        // For a through-hole, we don't need caps, but we can add them if needed
        
        // Validate we have enough geometry left
        if (newPositions.length < 3 || newIndices.length < 3) {
          console.warn("Hole creation left too few vertices. Skipping hole creation.");
          // Don't apply hole - return original mesh
        } else {
          // Create new geometry with circular hole
          const newGeometry = new THREE.BufferGeometry();
          newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
          if (newNormals.length > 0) {
            newGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(newNormals, 3));
          } else {
            newGeometry.computeVertexNormals();
          }
          if (newUvs.length > 0) {
            newGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(newUvs, 2));
          }
          if (newIndices.length > 0) {
            newGeometry.setIndex(newIndices);
          }
          newGeometry.computeBoundingBox();
          
          finalMesh = new THREE.Mesh(newGeometry);
          console.log(`Circular hole created with ${holeSegments} segments`);
        }
      }
    }

    // 9. Export to STL
    const exporter = new STLExporter();
    const stlString = exporter.parse(finalMesh);

    // 10. Convert STL string to Buffer
    const stlBuffer = Buffer.from(stlString, "utf-8");

    // 11. Store STL file in Convex storage
    const stlStorageId = await ctx.storage.store(
      new Blob([stlBuffer], { type: "model/stl" })
    );

    return { stlStorageId };
  },
});

