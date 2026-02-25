import LogoMark from './LogoMark';

interface LogoLoaderProps {
  sizeClassName?: string;
  className?: string;
}

export default function LogoLoader({
  sizeClassName = 'h-8 w-8',
  className = ''
}: LogoLoaderProps) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <span className={`absolute rounded-full border border-cyan-300/40 ${sizeClassName} animate-ping`} />
      <span className={`absolute rounded-full border border-blue-300/30 ${sizeClassName} animate-pulse`} />
      <LogoMark className={`${sizeClassName} animate-spin`} />
    </div>
  );
}

