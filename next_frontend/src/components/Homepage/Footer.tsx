import Link from "next/link";
import BrandLogo from "../BrandLogo";
import { Twitter, Linkedin, Github } from 'lucide-react';

const footerLinks = {
  product: [
    { name: "Pricing", href: "/pricing" },
    { name: "Join Waitlist", href: "/join-waitlist" },
    { name: "Features", href: "#" },
  ],
  //Info: Adding # for now
  company: [
    { name: "About Us", href: "#" },
    { name: "Contact", href: "#" },
    { name: "Careers", href: "#" },
  ],
  legal: [
    { name: "Privacy Policy", href: "/privacy-policy" },
    { name: "Terms of Service", href: "/terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t mt-20 border-gray-200">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          <div className="md:col-span-2">
            <BrandLogo />
            <p className="text-gray-500 mt-4 max-w-xs">
              AI-powered platform to accelerate your career and find your dream job.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Product</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-base text-gray-500 hover:text-gray-900">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Company</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-base text-gray-500 hover:text-gray-900">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase">Legal</h3>
            <ul className="mt-4 space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-base text-gray-500 hover:text-gray-900">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <div className="flex space-x-6">
            <a href="#" className="text-gray-400 hover:text-gray-500"><Twitter size={20} /></a>
            <a href="#" className="text-gray-400 hover:text-gray-500"><Github size={20} /></a>
            <a href="#" className="text-gray-400 hover:text-gray-500"><Linkedin size={20} /></a>
          </div>
          <div className="flex flex-col items-center sm:items-end mt-4 sm:mt-0">
             <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} DiscoverMinds. All rights reserved.</p>
             <span className="flex items-center gap-x-1.5 text-sm text-gray-400 mt-1">
              Made with <span className="text-red-500">❤️</span> in India
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
