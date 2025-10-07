"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { FieldValues, UseFormSetValue, Path, PathValue } from "react-hook-form";
import {
  countryCodes,
  CountryCode,
  findCountryByDialCode,
  getPopularCountryCodes,
  DEFAULT_COUNTRY_CODE,
} from "@/utils/countryCodes";

interface CountryCodeSelectorProps<TFieldValues extends FieldValues> {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  currentError?: string;
  error?: boolean;
  register?: any;
  setValue?: UseFormSetValue<TFieldValues>;
  name?: Path<TFieldValues>;
  icon?: React.ReactNode;
}

const MAX_LOCAL_DIGITS = 10;

function CountryCodeSelectorInner<TFieldValues extends FieldValues = FieldValues>(
  props: CountryCodeSelectorProps<TFieldValues>
): JSX.Element {
  const {
    value,
    onChange,
    className,
    selectClassName,
    inputClassName,
    error,
    register,
    name,
    setValue,
    icon,
    currentError,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      onChange(`${DEFAULT_COUNTRY_CODE}-`);
    }
  }, [value, onChange]);

  const dialCode = useMemo(() => (value.includes("-") ? value.split("-")[0] : ""), [value]);
  const phoneNumber = useMemo(
    () => (value.includes("-") ? value.split("-")[1] || "" : ""),
    [value]
  );

  const selectedCountry = useMemo(() => {
    if (!dialCode) return undefined;
    return findCountryByDialCode(dialCode);
  }, [dialCode]);

  const filteredCountries = useMemo(() => {
    if (!searchQuery) return countryCodes;
    const q = searchQuery.toLowerCase();
    return countryCodes.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const popularCountries = useMemo(() => getPopularCountryCodes(), []);

  const handleSelectCountry = useCallback(
    (country: CountryCode) => {
      onChange(`${country.dialCode}-${phoneNumber}`);
      setIsOpen(false);
      setSearchQuery("");
    },
    [onChange, phoneNumber]
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPhoneNumber = e.target.value.replace(/\D/g, "");
      onChange(`${dialCode}-${newPhoneNumber}`);
    },
    [dialCode, onChange]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
    setFocused(false);
  }, []);

  const handleFocus = useCallback(() => {
    setFocused(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery("");
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const combinedE164 = useMemo(
    () => (dialCode && phoneNumber ? `${dialCode}${phoneNumber}` : ""),
    [dialCode, phoneNumber]
  );

  useEffect(() => {
    if (setValue && name) {
      setValue(name, combinedE164 as PathValue<TFieldValues, Path<TFieldValues>>, {
        shouldDirty: !!combinedE164,
        shouldValidate: touched,
      });
    }
  }, [combinedE164, touched, name, setValue]);

  const missingCountryCode = !dialCode && phoneNumber.length > 0;

  const phoneNumberLengthError =
    (focused && phoneNumber.length > MAX_LOCAL_DIGITS) ||
    (!focused && touched && phoneNumber.length > 0 && phoneNumber.length !== MAX_LOCAL_DIGITS);

  const localInvalid = missingCountryCode || phoneNumberLengthError;

  return (
    <div className={`relative ${className || ""}`}>
      <div className="relative w-full">
        <div className="absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none z-20">
          {icon}
        </div>
        <div className="flex w-full relative rounded-lg group focus-within:ring-2 focus-within:ring-blue-400">
          <div className="relative z-10" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={`flex items-center justify-between w-24 pl-6 pr-2 py-3 bg-gray-100 border ${
                error || localInvalid ? "border-red-500" : "border-gray-300"
              } border-r-0 rounded-l-lg focus:outline-none group-focus-within:border-transparent ${
                error || localInvalid ? "focus:ring-red-500" : "focus:ring-gray-300"
              } ${selectClassName || ""}`}
              aria-haspopup="listbox"
              aria-expanded={isOpen}
            >
              {selectedCountry ? (
                <span className="flex items-center">
                  <span className="mr-2">{selectedCountry.flag}</span>
                  <span>{selectedCountry.dialCode}</span>
                </span>
              ) : (
                <span className="text-gray-500">Code</span>
              )}
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                />
              </svg>
            </button>

            {isOpen && (
              <div className="absolute z-50 w-72 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg left-0 top-full max-h-[300px] md:max-h-[200px] overflow-y-auto flex flex-col">
                <div className="sticky top-0 p-2 border-b bg-white z-10">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="overflow-y-auto overscroll-contain">
                  {!searchQuery && (
                    <div className="p-2 border-b">
                      <p className="text-xs text-gray-500 mb-1">Popular</p>
                      <div className="grid grid-cols-4 gap-1">
                        {popularCountries.map(country => (
                          <button
                            key={country.code}
                            type="button"
                            className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded-md"
                            onClick={() => handleSelectCountry(country)}
                          >
                            <span className="text-lg">{country.flag}</span>
                            <span className="text-xs mt-1">{country.dialCode}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredCountries.map(country => (
                    <button
                      key={country.code}
                      type="button"
                      className={`flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 ${
                        selectedCountry?.dialCode === country.dialCode ? "bg-gray-100" : ""
                      }`}
                      onClick={() => handleSelectCountry(country)}
                    >
                      <span className="mr-2">{country.flag}</span>
                      <span className="flex-1">{country.name}</span>
                      <span className="text-gray-500">{country.dialCode}</span>
                    </button>
                  ))}

                  {filteredCountries.length === 0 && (
                    <div className="p-4 text-center text-gray-500">No countries found</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="10-digit Phone Number"
            value={phoneNumber}
            onChange={handlePhoneChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            maxLength={MAX_LOCAL_DIGITS}
            className={`flex-1 bg-gray-100 border border-l-0 rounded-r-lg py-3 pl-4 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none ${
              error || localInvalid ? "border-red-500" : "border-gray-300"
            } group-focus-within:border-transparent ${inputClassName || ""}`}
            aria-invalid={Boolean(error || localInvalid)}
          />

          {/* Hidden registered field that RHF/yup will validate */}
          {register && name ? (
            <input type="hidden" {...register(name)} value={combinedE164} readOnly />
          ) : null}
        </div>
      </div>

      {/* Error message displayed below the input */}
      {(localInvalid || currentError) && (
        <div className="mt-1.5 bg-red-50/50 border border-red-100 rounded-md px-2.5 py-1 flex items-center">
          <svg
            className="w-3.5 h-3.5 text-red-400 mr-1.5 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-red-500/90 text-xs">
            {currentError
              ? currentError
              : !dialCode && phoneNumber.length > 0
                ? "Please select a country code."
                : "Phone number must be 10 digits."}
          </p>
        </div>
      )}
    </div>
  );
}

const CountryCodeSelector = React.memo(CountryCodeSelectorInner) as typeof CountryCodeSelectorInner;

export default CountryCodeSelector;
