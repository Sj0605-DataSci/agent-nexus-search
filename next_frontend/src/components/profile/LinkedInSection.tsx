import {
  RiLinkedinBoxFill,
  RiExternalLinkLine,
  RiEditLine,
  RiCheckboxCircleFill,
  RiErrorWarningFill,
  RiDownloadLine,
} from "react-icons/ri";
import { Button } from "../ui/button";

interface LinkedInSectionProps {
  linkedinUrl?: string;
  hasConnections: boolean;
  onEditClick: () => void;
  onConnectionsClick: () => void;
}

export function LinkedInSection({
  linkedinUrl,
  hasConnections,
  onEditClick,
  onConnectionsClick,
}: LinkedInSectionProps) {
  return (
    <div className="p-6 rounded-lg border bg-white border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-blue-100">
            <RiLinkedinBoxFill className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-semibold text-gray-900">LinkedIn Integration</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center gap-1.5 ${
            linkedinUrl
              ? "bg-white hover:bg-gray-50"
              : "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
          }`}
          onClick={onEditClick}
        >
          {linkedinUrl ? (
            <>
              <RiEditLine className="h-3.5 w-3.5" />
              Edit
            </>
          ) : (
            <>
              <RiLinkedinBoxFill className="h-3.5 w-3.5" />
              Connect LinkedIn
            </>
          )}
        </Button>
      </div>

      <div className="space-y-4">
        {/* Profile Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-700">Profile</h4>
            {linkedinUrl && (
              <div className="flex items-center text-green-600">
                <RiCheckboxCircleFill className="h-4 w-4" />
                <span className="ml-1 text-sm">Connected</span>
              </div>
            )}
          </div>

          {linkedinUrl ? (
            <div className="p-3 rounded-md bg-gray-50 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <RiLinkedinBoxFill className="flex-shrink-0 h-4 w-4 text-blue-600" />
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    {linkedinUrl}
                  </a>
                </div>
                <a
                  href={linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <RiExternalLinkLine className="h-3.5 w-3.5 text-gray-500" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-700">
                Connect your LinkedIn profile to enhance your networking experience and get more
                relevant connections.
              </p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Connections Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-700">Connections</h4>
              {hasConnections ? (
                <div className="flex items-center text-green-600">
                  <RiCheckboxCircleFill className="h-4 w-4" />
                  <span className="ml-1 text-sm">Synced</span>
                </div>
              ) : (
                <div className="flex items-center text-amber-600">
                  <RiErrorWarningFill className="h-4 w-4" />
                  <span className="ml-1 text-sm">Not synced</span>
                </div>
              )}
            </div>
            {!hasConnections && (
              <Button
                variant="outline"
                size="sm"
                className="text-sm bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100"
                onClick={onConnectionsClick}
              >
                <RiDownloadLine className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
            )}
          </div>

          {hasConnections ? (
            <div className="p-3 rounded-md bg-green-50 border border-green-200">
              <p className="text-sm text-green-700">
                Your LinkedIn connections have been successfully imported and are being used to
                enhance your networking recommendations.
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700">
                Import your LinkedIn connections to get personalized networking suggestions and
                discover mutual connections at events.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
