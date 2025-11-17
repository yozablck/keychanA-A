"use client";

import { Navbar } from "@/components/Navbar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Layers3, Zap, Download } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, type CarouselApi } from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";

export default function Home() {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  // Product images - user will upload these
  const productImages = [
    "/products/keychain-1.jpg",
    "/products/keychain-2.jpg",
    "/products/keychain-3.jpg",
    "/products/keychain-4.jpg",
  ];

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF9F6] via-[#F5F5F0] to-[#FAF9F6]">
      <Navbar />
      
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 text-foreground">
            Create Custom
            <span className="text-primary"> 3D Keychains</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Upload your logo or design, customize it, and generate a 3D printable STL file 
            for your personalized keychain. Simple, fast, and free.
          </p>
          
          <div className="flex items-center justify-center gap-4 mb-12">
            <Link href="/generate">
              <Button size="lg" className="text-lg px-8 py-6">
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/collections">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                Browse Gallery
              </Button>
            </Link>
          </div>

          {/* Product Slideshow */}
          <div className="max-w-5xl mx-auto mt-12 relative">
            <Carousel
              setApi={setApi}
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 5000,
                  stopOnInteraction: false,
                }),
              ]}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4">
                {productImages.map((image, index) => (
                  <CarouselItem key={index} className="pl-2 md:pl-4 md:basis-1/2 lg:basis-1/3">
                    <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100/50 border border-border/30 shadow-sm hover:shadow-md transition-shadow">
                      <img
                        src={image}
                        alt={`Keychain product ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Show placeholder for missing images
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent && !parent.querySelector('.placeholder')) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'w-full h-full flex items-center justify-center text-muted-foreground text-sm placeholder';
                            placeholder.textContent = `Image ${index + 1}`;
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselNext className="right-2 h-10 w-10 bg-[#FAF9F6]/90 hover:bg-[#FAF9F6] shadow-md border border-border/50 backdrop-blur-sm" />
            </Carousel>
            {/* Slide indicators */}
            {count > 0 && (
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      index + 1 === current ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
                    }`}
                    onClick={() => api?.scrollTo(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <Layers3 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Upload</h3>
            <p className="text-muted-foreground">
              Simply upload your 2D image (PNG or JPG) and we'll convert it to 3D
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Instant Generation</h3>
            <p className="text-muted-foreground">
              Our AI-powered conversion creates your 3D model in seconds
            </p>
          </div>
          
          <div className="text-center p-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
              <Download className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Download STL</h3>
            <p className="text-muted-foreground">
              Get your STL file ready for 3D printing immediately
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4 text-foreground">
            Ready to Create Your Keychain?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of creators making custom 3D keychains
          </p>
          <Link href="/generate">
            <Button size="lg" className="text-lg px-8 py-6">
              Start Creating Now
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
