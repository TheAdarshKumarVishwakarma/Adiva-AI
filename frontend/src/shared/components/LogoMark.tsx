interface LogoMarkProps {
  className?: string;
  alt?: string;
}

export default function LogoMark({ className = 'h-6 w-6', alt = 'Adiva logo' }: LogoMarkProps) {
  return (
    <img
      src="/logo-infinity-a.svg"
      alt={alt}
      className={className}
      draggable={false}
    />
  );
}
