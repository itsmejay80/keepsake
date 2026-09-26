import logoImgWhite from "../public/logo-full-white.png";
import logoImg from "../public/logo-full.png";

export default function Logo() {
  return (
    <span className="flex items-center justify-center">
      <img src={logoImg} alt="Keepsake logo" className="h-14 dark:hidden" />
      <img
        src={logoImgWhite}
        alt="Keepsake logo"
        className="hidden h-14 dark:block"
      />
    </span>
  );
}
