import { redirect } from "next/navigation";

interface ExplorePageProps {
  params: {
    slug: string;
  };
}

export default function ExplorePage({ params }: ExplorePageProps) {
  redirect(`/user-query?q=${params.slug}`);
}
