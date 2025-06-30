"use client";

import { Suspense } from "react";

import SearchParamRoot from "./SearchParamRoot";
import withAuth from "@/hoc/withAuth";

const SearchEngine = () => {
  return (
    <Suspense fallback={null}>
      <SearchParamRoot />
    </Suspense>
  );
};
export default withAuth(SearchEngine);
