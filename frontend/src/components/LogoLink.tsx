import Image from "next/image";
import Link from "next/link";

export function LogoLink({ size = 48, showName = true }: { size?: number; showName?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="SichrPlace home"
      className="logo-link"
    >
      <Image
        src="/img/SichrPlaceLogo_945x945.jpg"
        alt="SichrPlace"
        width={size}
        height={size}
        className="logo-link-img"
        priority
      />
      {showName && <span className="logo-link-name">SichrPlace</span>}
    </Link>
  );
}
