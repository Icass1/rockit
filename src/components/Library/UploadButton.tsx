import { Upload } from "lucide-react";

interface UploadButtonProps {
  onToggle?: () => void;
}

export default function UploadButton({ onToggle }: UploadButtonProps) {
  return (
    <button
      onClick={onToggle}
      title="Upload Songs or Albums"
      className="h-8 w-8 cursor-pointer rounded-full bg-gradient-to-r shadow-[0px_0px_20px_3px_#0e0e0e] transition-transform md:h-16 md:w-16 md:hover:scale-105 flex items-center justify-center"
    >
      <Upload className="h-1/2 w-1/2" />
    </button>
  );
}
