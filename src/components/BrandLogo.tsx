type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return <img className={className} src="/logo_colorato.png" alt="Idromardi" />;
}
