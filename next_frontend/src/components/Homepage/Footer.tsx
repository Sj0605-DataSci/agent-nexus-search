import Link from "next/link";
import BrandLogo from "../BrandLogo";

export default function Footer() {
  return (
    <footer className="bg-white py-12 border-t border-gray-100">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center space-y-8">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            aria-label="Discoverminds Home"
          >
            <BrandLogo darkMode={false} className="mb-1" />
          </Link>

          <nav>
            <ul className="flex items-center gap-x-8 text-sm">
              <li>
                <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Home
                </Link>
              </li>

              <li>
                <Link href="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Login
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex flex-col items-center text-sm text-gray-400 space-y-1">
            <span>Team Discover Minds</span>
            <span className="flex items-center gap-x-1.5">
              Made with <span className="text-red-500">❤️</span> in India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
