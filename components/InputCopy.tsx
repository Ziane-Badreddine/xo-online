import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";

export default function CopyInput({gameId}: {gameId: string}) {
  
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy: ", error);
    }
  };

  return (
    <div className="flex items-center space-x-2 w-full">
      <Input  value={gameId} readOnly className="w-full" />
      <Button onClick={handleCopy} variant="outline">
        <ClipboardCopy className="w-5 h-5" />
      </Button>
      {copied && <span className="text-sm text-green-500">Copié!</span>}
    </div>
  );
}
