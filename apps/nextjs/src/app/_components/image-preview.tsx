"use client";

export function ImagePreview({
  src,
  onRemove,
}: {
  src: string;
  onRemove: () => void;
}) {
  return (
    <div className="group relative h-20 w-20 shrink-0">
      <img
        src={src}
        alt="Preview"
        className="h-full w-full rounded-lg object-cover"
        draggable={false}
      />
      <button
        onClick={onRemove}
        className="bg-ocean-foam/80 hover:bg-red-500 hover:text-white absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs opacity-0 transition-opacity group-hover:opacity-100"
      >
        &times;
      </button>
    </div>
  );
}
