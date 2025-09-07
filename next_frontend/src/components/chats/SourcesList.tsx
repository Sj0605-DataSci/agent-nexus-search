import { FiExternalLink, FiInfo } from "react-icons/fi";

export interface Source {
  title?: string;
  value: string;
  short_url?: string;
  isGathered?: boolean;
}

interface SourcesListProps {
  sources: (Source | string | { sources: Source[] })[] | null | undefined;
  sourcesGathered?: (Source | string | { sources: Source[] })[] | null | undefined;
}

const normalizeSources = (sources: any, isGathered: boolean = false): Source[] => {
  if (!sources) return [];

  return sources.flatMap((item: any, index: number) => {
    if (item && Array.isArray(item.sources)) {
      return item.sources.map((src: any, i: number) => ({
        ...src,
        isGathered,
        short_url: isGathered ? src.value : src.short_url || `[${i + 1}]`,
      }));
    }
    if (typeof item === "string") {
      return {
        value: item,
        title: isGathered ? item : "Source",
        short_url: isGathered ? item : `[${index + 1}]`,
        isGathered,
      };
    }
    if (item && typeof item === "object" && "value" in item) {
      return {
        ...item,
        short_url: isGathered ? item.value : item.short_url || `[${index + 1}]`,
        isGathered,
      };
    }
    return [];
  });
};

const SourcesList = ({ sources, sourcesGathered }: SourcesListProps) => {
  const normalizedSources = normalizeSources(sources, false);
  const normalizedGathered = normalizeSources(sourcesGathered, true);

  const sourcesToShow = normalizedSources.length > 0 ? normalizedSources : normalizedGathered;
  const hasSources = sourcesToShow.length > 0;

  return (
    <div className="text-gray-700">
      <div className="mb-2 flex items-center">
        <FiInfo className="w-3.5 h-3.5 mr-1.5 text-blue-500 flex-shrink-0" />
        <span className="text-xs font-medium text-gray-600">
          {hasSources
            ? `${sourcesToShow.length} ${sourcesToShow.length === 1 ? "source" : "sources"} used`
            : "No sources available"}
        </span>
      </div>
      <ul className="space-y-2">
        {sourcesToShow?.map((source, index) => {
          const src: Source =
            typeof source === "string"
              ? {
                  value: source,
                  title: `Source ${index + 1}`,
                  short_url: `[${index + 1}]`,
                }
              : {
                  ...source,
                  value: source.value || "",
                  title: source.title || `Source ${index + 1}`,
                  short_url: source.short_url || `[${index + 1}]`,
                };

          return (
            <li
              key={index}
              className="group rounded-lg border border-gray-200 hover:border-blue-200 transition-colors duration-150"
            >
              <a
                href={src.value}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 hover:bg-gray-50 rounded-lg transition-colors duration-150"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-blue-50 text-blue-700 text-xs font-medium self-start mt-0.5">
                    <span className="relative -top-px">{src.short_url}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className="text-sm font-medium text-gray-800 line-clamp-2 leading-tight"
                      title={src.title}
                    >
                      {src.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-xs text-blue-600 group-hover:text-blue-500 truncate">
                        {src.isGathered ? src.value : new URL(src.value).hostname}
                      </span>
                      <FiExternalLink className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
                    </div>
                  </div>
                </div>
              </a>
            </li>
          );
        })}
        {!hasSources && (
          <li className="p-2 text-center text-gray-500 text-xs">No sources available</li>
        )}
      </ul>
    </div>
  );
};

export default SourcesList;
