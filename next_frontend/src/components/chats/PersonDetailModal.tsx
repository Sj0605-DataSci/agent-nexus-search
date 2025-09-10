import React from "react";
import {
  BriefcaseBusiness,
  AtSign,
  Share,
  Linkedin,
  Twitter,
  Globe,
  Github,
  Facebook,
  Instagram,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import PaginationControls from "./PaginationControls";
import CustomAvatar from "../ui/CustomAvatar";
import { SocialLinks } from "../ui/SocialLinks";
import Image from "next/image";

interface ScoreData {
  confidence: number;
  quotes: string[];
  matching_traits: string[];
}

interface ScoringItem {
  traitDescription: React.JSX.Element;
  confidence: number;
  traitTitle: string;
}

interface Person {
  id?: string;
  FName?: string;
  LName?: string;
  SocialLinks?: string;
  Avatar?: string;
  Company?: string;
  Title?: string;
  Location?: string;
  Headline?: string;
  Score?: string;
  scoring?: ScoringItem[];
  all_quotes?: string[];
  MutualConnection?: string;
  [key: string]: any;
}

interface PersonDetailModalProps {
  person: Person | null;
  isOpen: boolean;
  onClose: () => void;
  currentIndex?: number;
  totalCount?: number;
  onNext?: () => void;
  onPrevious?: () => void;
}

const renderSocialLinkIcon = (link: string) => {
  if (!link) return null;

  const icon = (IconComponent: React.ElementType) => (
    <IconComponent className="size-4 text-gray-500 hover:text-gray-800" />
  );

  if (link.includes("linkedin.com")) return icon(Linkedin);
  if (link.includes("twitter.com")) return icon(Twitter);
  if (link.includes("facebook.com")) return icon(Facebook);
  if (link.includes("instagram.com")) return icon(Instagram);
  if (link.includes("github.com")) return icon(Github);

  return icon(Globe);
};

const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  isOpen,
  onClose,
  currentIndex,
  totalCount,
  onNext,
  onPrevious,
}) => {
  if (!person) return null;

  const fullName = `${person.FName || ""} ${person.LName || ""}`.trim();

  const quotes = Array.isArray(person.all_quotes) ? person.all_quotes : [];

  const traits = Array.isArray(person.scoring)
    ? person.scoring.map(item => item.traitTitle).filter(Boolean)
    : [];

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        className="relative max-w-3xl w-full bg-white rounded-xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => toast.success("Share feature is under development", {
                duration: 3000,
                position: "top-center",
                icon: "🚧",
              })} 
              className="h-9 px-4 py-2 text-sm font-medium bg-white border border-gray-200 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Share className="size-4" />
            </button>
            <button 
              onClick={() => toast.success("Get an intro feature is under development", {
                duration: 3000,
                position: "top-center",
                icon: "🚧",
              })} 
              className="h-9 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5"
            >
              Get an intro
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          <div>
            <div className="mb-6 flex items-center gap-4">
              {person.Avatar ? (
                <div className="relative h-12 w-12 mt-8 rounded-full overflow-hidden">
                  <Image
                    src={person.Avatar}
                    alt={fullName}
                    width={48}
                    height={48}
                    className="object-cover rounded-full border border-gray-200"
                    unoptimized={person.Avatar.includes("linkedin.com")}
                    onError={e => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ display: "none" }}
                  >
                    <CustomAvatar name={fullName} size="md" />
                  </div>
                </div>
              ) : (
                <CustomAvatar name={fullName} size="md" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                    {person.Title && (
                      <p className="text-base text-gray-700 mt-0.5">{person.Title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <SocialLinks
                      socialLinks={person["SocialLinks"]}
                      maxLinks={5}
                      textSize="text-sm"
                      showTooltip={true}
                      showLabels={false}
                    />
                  </div>
                </div>

                <div className=" flex items-center flex-col md:flex-row items-start md:gap-3">
                  {person.Company && (
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                      <BriefcaseBusiness className="size-4 text-gray-500" />
                      {person.Company}
                    </div>
                  )}
                  {person.Location && (
                    <div className="text-sm text-gray-700 flex items-center gap-1.5">
                      <span className="inline-block h-1 w-1 rounded-full bg-gray-300"></span>
                      {person.Location}
                    </div>
                  )}
                </div>

                {person.Headline && <p className="text-sm text-gray-600 ">{person.Headline}</p>}
              </div>
            </div>
            <div className=" space-y-1">
              {person.scoring && person.scoring.length > 0 && (
                <div>
                  <h3 className="mb-2 text-base font-semibold text-gray-800">Traits</h3>
                  <div>
                    {[...person.scoring]
                      ?.sort((a, b) => b.confidence - a.confidence)
                      .map((item, index) => (
                        <div key={index} className="mb-1 flex flex-row items-center">
                          <div className="bg-gray-100 text-gray-600 inline-block px-3 py-1 rounded-md font-medium text-sm mb-2">
                            <span dangerouslySetInnerHTML={{ __html: item.traitTitle }} />
                          </div>
                          <div>
                            {item?.traitDescription && (
                              <div
                                className="text-sm text-gray-700 -mt-2  ml-3 leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: item?.traitDescription }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {quotes.length > 0 && (
                <div>
                  <h3 className="mb-2 text-base font-semibold text-gray-800">Quotes</h3>
                  <div className="space-y-3">
                    {quotes.length > 0 && (
                      <div className="mb-4">
                        <ul className="list-disc pl-5 space-y-1">
                          {quotes.slice(0, 5).map((quote: string, idx: number) => (
                            <li key={idx} className="text-sm text-gray-700">
                              <div
                                className="text-sm text-gray-700"
                                dangerouslySetInnerHTML={{ __html: quote }}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {person.MutualConnection && (
                <div>
                  <h3 className="mb-3 text-base font-semibold text-gray-800">Mutual Connection</h3>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <div className="flex-shrink-0 mr-3">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 border border-green-200">
                        <span className="text-xs font-medium text-green-700">A</span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-800">Ashish Gupta</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {currentIndex !== undefined && totalCount !== undefined && totalCount > 1 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <PaginationControls
              currentIndex={currentIndex}
              totalCount={totalCount}
              onPrevious={onPrevious || (() => {})}
              onNext={onNext || (() => {})}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PersonDetailModal;
