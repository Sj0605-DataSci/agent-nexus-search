import Link from "next/link";

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-gray-50">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center justify-center mb-16">
          <div className="inline-block px-4 py-1.5 rounded-full bg-[#80A9F9]/20 text-[#3B7DDD] text-sm font-medium mb-4">
            ⚔️ Why Choose Arya
          </div>
          <h4 className="text-3xl font-bold mb-4 text-center md:text-4xl">
            Arya vs. The Competition
          </h4>
          <p className="text-gray-600 text-center max-w-2xl">
            See why professionals choose Arya's sharp instincts over traditional search tools
          </p>
        </div>

        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-100">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="p-4 px-3 text-left min-w-[220px]">Features</th>
                <th className="p-4 px-2 text-center bg-[#EEF3FB] rounded-tl-lg min-w-[180px]">
                  <span className="block font-bold text-[#3B7DDD]">⚔️ Arya</span>
                  <span className="text-sm font-normal">Professional $15/mo</span>
                  <p className="text-xs mt-1 text-gray-600">
                    Best for precision people hunting & learning
                  </p>
                </th>
                <th className="p-4 px-2 text-center min-w-[180px]">
                  <span className="block font-bold">LinkedIn Sales Nav</span>
                  <span className="text-sm font-normal">$99/mo</span>
                  <p className="text-xs mt-1 text-gray-600">Best for LinkedIn network access</p>
                </th>
                <th className="p-4 px-2 text-center min-w-[180px]">
                  <span className="block font-bold">Apollo.io</span>
                  <span className="text-sm font-normal">$49/mo</span>
                  <p className="text-xs mt-1 text-gray-600">Best for sales engagement</p>
                </th>
                <th className="p-4 px-2 text-center min-w-[180px]">
                  <span className="block font-bold">Lusha</span>
                  <span className="text-sm font-normal">$49/mo</span>
                  <p className="text-xs mt-1 text-gray-600">Best for contact data accuracy</p>
                </th>
                <th className="p-4 px-2 text-center min-w-[180px]">
                  <span className="block font-bold">ZoomInfo</span>
                  <span className="text-sm font-normal">$99+/mo</span>
                  <p className="text-xs mt-1 text-gray-600">Best for enterprise B2B data</p>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">
                  ⚔️ Arya's Sharp Instincts (Natural Language)
                </td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">
                  ✓<br />
                  <span className="text-xs text-gray-500">
                    Understands intent like faces in Winterfell
                  </span>
                </td>
                <td className="p-4 px-2 text-center text-red-500">
                  ✗<br />
                  <span className="text-xs text-gray-500">Uses traditional filters</span>
                </td>
                <td className="p-4 px-2 text-center text-red-500">
                  ✗<br />
                  <span className="text-xs text-gray-500">Basic search only</span>
                </td>
                <td className="p-4 px-2 text-center text-red-500">
                  ✗<br />
                  <span className="text-xs text-gray-500">Keyword-based</span>
                </td>
                <td className="p-4 px-2 text-center text-yellow-500">
                  Basic Only
                  <br />
                  <span className="text-xs text-gray-500">Limited NLP</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">
                  🧠 Learns & Adapts (Gets Sharper Every Hunt)
                </td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">
                  ✓<br />
                  <span className="text-xs text-gray-500">Remembers patterns & preferences</span>
                </td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">Free Tier Available</td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">✓</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-yellow-500">Limited</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">
                  🌍 Travels Everywhere (Global + Personal Networks)
                </td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">
                  ✓<br />
                  <span className="text-xs text-gray-500">From inbox to globe—no lead escapes</span>
                </td>
                <td className="p-4 px-2 text-center text-red-500">
                  ✗<br />
                  <span className="text-xs text-gray-500">Limited to InMail</span>
                </td>
                <td className="p-4 px-2 text-center text-green-500">
                  ✓<br />
                  <span className="text-xs text-green-600">✓ Best for sales engagement</span>
                </td>
                <td className="p-4 px-2 text-center text-yellow-500">
                  Enterprise Only
                  <br />
                  <span className="text-xs text-gray-500">High-tier plans</span>
                </td>
                <td className="p-4 px-2 text-center text-yellow-500">
                  Enterprise Only
                  <br />
                  <span className="text-xs text-gray-500">Custom integration</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">🎯 Delivers the Truth (Verified Results)</td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">
                  ✓<br />
                  <span className="text-xs text-gray-500">No guesswork, just facts</span>
                </td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">🔍 Multi-Platform Tracking</td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">
                  ✓<br />
                  <span className="text-xs text-gray-500">LinkedIn, Gmail, Slack & more</span>
                </td>
                <td className="p-4 px-2 text-center text-green-500">
                  ✓<br />
                  <span className="text-xs text-gray-500">Native integration</span>
                  <br />
                  <span className="text-xs text-green-600">✓ Best in class</span>
                </td>
                <td className="p-4 px-2 text-center text-yellow-500">
                  Browser Ext.
                  <br />
                  <span className="text-xs text-gray-500">Extension required</span>
                </td>
                <td className="p-4 px-2 text-center text-green-500">
                  ✓<br />
                  <span className="text-xs text-gray-500">Chrome extension</span>
                  <br />
                  <span className="text-xs text-green-600">✓ Seamless contact enrichment</span>
                </td>
                <td className="p-4 px-2 text-center text-yellow-500">
                  Enterprise Only
                  <br />
                  <span className="text-xs text-gray-500">High-tier plans</span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">Search Within Connections</td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">✓</td>
                <td className="p-4 px-2 text-center text-green-500">✓</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
                <td className="p-4 px-2 text-center text-red-500">✗</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">Export to CSV/Excel</td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">✓</td>
                <td className="p-4 px-2 text-center text-green-500">✓</td>
                <td className="p-4 px-2 text-center text-green-500">✓</td>
                <td className="p-4 px-2 text-center text-yellow-500">Limited</td>
                <td className="p-4 px-2 text-center text-green-500">✓</td>
              </tr>

              <tr className="border-b border-gray-100">
                <td className="p-4 px-3 font-medium">🤝 Team Hunt Coordination</td>
                <td className="p-4 px-2 text-center text-green-500 bg-[#F8FAFF]">
                  ✓<br />
                  <span className="text-xs text-gray-500">Share Arya's findings instantly</span>
                </td>
                <td className="p-4 px-2 text-center text-yellow-500">
                  Basic
                  <br />
                  <span className="text-xs text-gray-500">Lead sharing only</span>
                </td>
                <td className="p-4 px-2 text-center text-green-500">
                  ✓<br />
                  <span className="text-xs text-gray-500">Strong for sales teams</span>
                  <br />
                  <span className="text-xs text-green-600">✓ Advanced CRM sync</span>
                </td>
                <td className="p-4 px-2 text-center text-yellow-500">
                  Basic
                  <br />
                  <span className="text-xs text-gray-500">Contact sharing</span>
                </td>
                <td className="p-4 px-2 text-center text-green-500">
                  ✓<br />
                  <span className="text-xs text-gray-500">Enterprise-grade</span>
                  <br />
                  <span className="text-xs text-green-600">✓ Robust permission controls</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 px-2"></td>
                <td className="p-4 px-2 text-center bg-[#F8FAFF]">
                  <Link href="/user-auth?plan=professional">
                    <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#5D9CEC] via-[#4A89DC] to-[#3B7DDD] text-white hover:opacity-90 transition-colors duration-200 text-sm font-medium">
                      ⚔️ Unleash Arya
                    </button>
                  </Link>
                </td>
                <td className="p-4 px-2 text-center"></td>
                <td className="p-4 px-2 text-center"></td>
                <td className="p-4 px-2 text-center"></td>
                <td className="p-4 px-2 text-center"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
export default WhyChooseUs;
