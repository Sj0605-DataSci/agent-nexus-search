import Link from "next/link";
import termsOfService from "@/constant/terms-of-service.json";

export const metadata = {
  title: "Terms of Service | DiscoverMinds.ai",
  description: "Terms of Service for DiscoverMinds.ai - The first context-aware, agent-powered search engine for people.",
};

const TermsOfServicePage = () => {
  return (
    <div
      className={`min-h-screen flex items-center bg-white/90 justify-center transition-colors duration-500 bg-gradient-to-br from-white/90 to-white/80 `}
    >
      <div
        className={`relative w-full max-w-3xl mx-2 p-8 sm:p-10 mt-10 transition-colors duration-500 bg-white/90 border-white/20 `}
      >
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <span className={`text-3xl font-bold text-gray-900`}>DiscoverMinds.ai</span>
          </Link>
          <h1 className={`text-2xl font-bold mb-2 text-gray-900`}>{termsOfService.title}</h1>
          <p className={"text-gray-600"}>{termsOfService.introduction}</p>
          <p className="text-xs mt-2">{`Last updated: ${termsOfService.lastUpdated}`}</p>
        </div>
        <div className="space-y-8">
          {termsOfService.sections.map((section, idx) => (
            <section key={idx}>
              <h2 className={`text-xl font-semibold mb-2 text-gray-900`}>{section.title}</h2>
              {section.title === '4. User Conduct' ? (
                <div className="space-y-2">
                  <p className="text-gray-800">{section.content[0]}</p>
                  <ul className="list-disc ml-6 space-y-1">
                    {section.content.slice(1).map((point, jdx) => (
                      <li key={jdx} className="text-gray-800">
                        {point.startsWith('- ') ? point.substring(2) : point}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="space-y-2">
                  {section.content.map((point, jdx) => (
                    <p key={jdx} className="text-gray-800">
                      {point}
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
        <div className="mt-10 border-t pt-6">
          <h2 className="text-xl font-semibold mb-2 text-gray-900">Contact</h2>
          <ul className="ml-2 space-y-1">
            <li className="text-gray-800">
              <strong>Email:</strong>{" "}
              <a
                href={`mailto:${termsOfService.contact.sendto}`}
                className="underline text-blue-600"
              >
                {termsOfService.contact.sendto}
              </a>
            </li>
            <li className="text-gray-800">
              <strong>Address:</strong> {termsOfService.contact.address}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
