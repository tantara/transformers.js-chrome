import Image from "next/image";

export function TinyWhaleLogo({
  className,
  width = 48,
  height = 48,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src="/logo.svg"
      alt="TinyWhale logo"
      width={width}
      height={height}
      className={className}
    />
  );
}
