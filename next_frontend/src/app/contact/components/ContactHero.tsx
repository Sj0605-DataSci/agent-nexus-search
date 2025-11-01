
import { CheckCircle } from "lucide-react";

export default function ContactHero() {
  return (
    <div className="space-y-8 flex flex-col justify-center">
      <div>
        <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></span>
          Get in Touch with Tara
        </div>

        <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
          <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 bg-clip-text text-transparent">
            Ready to Transform
          </span>
          <br />
          <span className="text-gray-900">Your TallyPrime</span>
          <br />
          <span className="text-gray-900">Experience?</span>
        </h1>

        <p className="text-xl text-gray-600 leading-relaxed mb-8">
          Join hundreds of businesses already using Tara to automate their accounting, get
          instant answers via WhatsApp, and save hours every week on manual data entry.
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-700">24/7 WhatsApp support for instant answers</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-700">Photo-to-invoice automation with AI</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <span className="text-gray-700">Direct TallyPrime integration</span>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="space-y-6 pt-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">R</span>
            </div>
          </div>
          <div>
            <p className="text-gray-600 italic mb-2">
              "Tara has saved us 5 hours every week. Now I just WhatsApp my invoices and
              they're automatically entered into Tally!"
            </p>
            <p className="text-sm text-gray-500">- Rajesh, CA Practice</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
          </div>
          <div>
            <p className="text-gray-600 italic mb-2">
              "The WhatsApp integration is a game-changer. My team can get stock levels and
              pricing instantly, even when they're on the field."
            </p>
            <p className="text-sm text-gray-500">- Suresh, Retail Business</p>
          </div>
        </div>
      </div>
    </div>
  );
}
