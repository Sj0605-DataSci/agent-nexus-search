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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import PaginationControls from "./PaginationControls";
import CustomAvatar from "../ui/CustomAvatar";
import { SocialLinks } from "../ui/SocialLinks";

interface Person {
  FName?: string;
  LName?: string;
  SocialLinks?: string;
  Email?: string;
  Score?: string;
  Reason?: string;
  Avatar?: string;
  Company?: string;
  Title?: string;
  [key: string]: string | undefined;
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

  console.log("123", person);
  const traits = Object.entries(person).filter(
    ([key, value]) =>
      !["FName", "LName", "SocialLinks", "Email", "Score", "Avatar", "Company", "Title"].includes(
        key
      ) &&
      value &&
      value !== "null"
  );

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f0f0f99] bg-opacity-90 p-4"
    >
      <div
        className="relative max-w-lg w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center gap-1.5">
                <Share className="size-4" />
              </button>
              <button className="h-8 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1.5">
                Get an intro
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </div>
          <div>
            <div className="mb-4 flex items-center gap-3">
              <CustomAvatar
                name={`${person.FName || ""} ${person.LName || ""}`.trim()}
                src={person.Avatar}
                size="lg"
                showBorder
              />
              <div className="flex-1">
                <span className="break-all text-2xl font-bold text-gray-900">{fullName}</span>
                <div className="flex flex-col mt-1">
                  {person.Company && (
                    <div className="text-sm font-medium leading-snug text-gray-600">
                      <span className="inline-flex items-center">
                        <BriefcaseBusiness className="mr-1.5 size-4 shrink-0" />
                        {person.Company}
                      </span>
                    </div>
                  )}
                  {person.Title && (
                    <span className="text-sm text-gray-500 ml-5 -mt-1">{person.Title}</span>
                  )}
                </div>
                <div className="mt-1">
                  <SocialLinks
                    email={person.Email}
                    socialLinks={person["SocialLinks"]}
                    maxLinks={3}
                    textSize="text-xs"
                    showTooltip={true}
                    showLabels={false}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-5">
              {traits.length > 0 && (
                <div>
                  <h3 className="mb-2 text-base font-semibold text-gray-800">Traits</h3>
                  <div className="flex flex-wrap gap-2">
                    {traits.map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-md bg-gray-100 px-3 py-1 text-sm text-gray-800"
                      >
                        {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* <div>
              <h3 className="mb-2 text-base font-semibold text-gray-800">Mutuals</h3>
              <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/placeholder.svg?height=36&width=36" alt="Your advisor" />
                  <AvatarFallback>YA</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-gray-800">Your advisor</span>
              </div>
            </div>
            {person.Reason && (
              <div>
                <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
                  {person.Reason}
                </div>
              </div>
            )} */}
            </div>
          </div>
          {currentIndex !== undefined && totalCount !== undefined && totalCount > 1 && (
            <PaginationControls
              currentIndex={currentIndex}
              totalCount={totalCount}
              onPrevious={onPrevious || (() => {})}
              onNext={onNext || (() => {})}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonDetailModal;
