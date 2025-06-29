"use client";

import { Suspense } from "react";

import SearchParamRoot from "./SearchParamRoot";

const SearchEngine = () => {
  return (
    <Suspense fallback={null}>
      <SearchParamRoot />
    </Suspense>
  );
};

export default SearchEngine;
