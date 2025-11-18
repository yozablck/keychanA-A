import { Navbar } from "@/components/Navbar";
import { CollectionsContent } from "@/components/CollectionsContent";

export default function CollectionsPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <Navbar />
      <CollectionsContent />
    </div>
  );
}

