import Link from "next/link";

const WhyDiscoverMinds = () => {
  return (
    <section id="why-discoverminds" className="py-20 bg-gray-50">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center justify-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#B2DC8A] text-[#0E3D15] text-sm font-medium mb-4">
            🔍 Platform Comparison
          </div>
          <h4 className="text-3xl font-bold mb-4 text-center md:text-4xl">
            DiscoverMinds vs LinkedIn Sales Navigator
          </h4>
          <p className="text-gray-600 text-center max-w-2xl">
            See why professionals choose DiscoverMind's intelligent search over traditional tools
          </p>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-4 px-3 text-left min-w-[220px]">Features</th>
                <th className="p-4 px-2 text-center bg-[#FAFFF2] rounded-tl-lg min-w-[180px]">
                  <span className="block font-bold text-[#0E3D15]">DiscoverMinds</span>
                  <span className="text-sm font-normal">Pro $15/mo</span>
                  <p className="text-xs mt-1 text-gray-600">
                    Best for precision people hunting & learning
                  </p>
                </th>
                <th className="p-4 px-2 text-center min-w-[180px]">
                  <span className="block font-bold">LinkedIn Sales Nav</span>
                  <span className="text-sm font-normal">$99/mo</span>
                  <p className="text-xs mt-1 text-gray-600">Best for LinkedIn network access</p>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Natural Language Search</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">
                  ✓<br />
                  <span className="text-xs text-gray-500">Understands intent and context</span>
                </td>
                <td className="p-3 px-2 text-center text-red-500">
                  ✗<br />
                  <span className="text-xs text-gray-500">Uses traditional filters</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Learns & Adapts</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">
                  ✓<br />
                  <span className="text-xs text-gray-500">Remembers patterns & preferences</span>
                </td>
                <td className="p-3 px-2 text-center text-red-500">✗</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Free Tier Available</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">✓</td>
                <td className="p-3 px-2 text-center text-red-500">✗</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">DiscoverMinds + Personal Networks</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">
                  ✓<br />
                  <span className="text-xs text-gray-500">
                    From inbox to globe-comprehensive search
                  </span>
                </td>
                <td className="p-3 px-2 text-center text-red-500">
                  ✗<br />
                  <span className="text-xs text-gray-500">Limited to InMail</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Verified Results</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">
                  ✓<br />
                  <span className="text-xs text-gray-500">No guesswork, just facts</span>
                </td>
                <td className="p-3 px-2 text-center text-red-500">✗</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Multi-Platform Tracking</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">
                  ✓<br />
                  <span className="text-xs text-gray-500">LinkedIn, Gmail, Slack & more</span>
                </td>
                <td className="p-3 px-2 text-center text-green-500">
                  ✓<br />
                  <span className="text-xs text-gray-500">Native integration</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Search Within Connections</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">✓</td>
                <td className="p-3 px-2 text-center text-green-500">✓</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Export to CSV/Excel</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">✓</td>
                <td className="p-3 px-2 text-center text-green-500">✓</td>
              </tr>

              <tr className="border-b border-gray-100">
                <td className="p-3 px-3 font-medium">Team Collaboration</td>
                <td className="p-3 px-2 text-center text-green-500 bg-[#FAFFF2]">
                  ✓<br />
                  <span className="text-xs text-gray-500">Share findings instantly</span>
                </td>
                <td className="p-3 px-2 text-center text-yellow-500">
                  Basic
                  <br />
                  <span className="text-xs text-gray-500">Lead sharing only</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 px-2"></td>
                <td className="p-4 px-2 text-center bg-[#FAFFF2]">
                  <Link href="/user-auth">
                    <button className="px-6 py-2.5 rounded-lg bg-[#B2DC8A] text-[#0E3D15] px-4 sm:px-6 py-2 text-sm sm:text-base font-medium transition-colors  hover:opacity-90 transition-colors duration-200 text-sm font-medium">
                      Get Started
                    </button>
                  </Link>
                </td>
                <td className="p-4 px-2 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
export default WhyDiscoverMinds;
