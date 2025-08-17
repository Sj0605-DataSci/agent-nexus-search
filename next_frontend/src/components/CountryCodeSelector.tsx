import React, { memo, useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  countryCodes,
  CountryCode,
  findCountryByDialCode,
  getPopularCountryCodes,
  DEFAULT_COUNTRY_CODE,
} from "@/utils/countryCodes";

interface CountryCodeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  selectClassName?: string;
  inputClassName?: string;
  error?: boolean;
  register?: any;
  setValue?: (name: string, value: any, options?: any) => void;
  name?: string;
}

const MAX_LOCAL_DIGITS = 10;

const CountryCodeSelector: React.FC<CountryCodeSelectorProps> = ({
  value,
  onChange,
  className,
  selectClassName,
  inputClassName,
  error,
  register,
  name,
  setValue,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [touched, setTouched] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value) {
      onChange(`${DEFAULT_COUNTRY_CODE}-`);
    }
  }, [value, onChange]);

  const dialCode = useMemo(() => (value.includes("-") ? value.split("-")[0] : ""), [value]);

  useEffect(() => {
    if (value.includes("-")) {
      setPhoneNumber(value.split("-")[1] || "");
    }
  }, [value]);

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

  const selectedCountry = useMemo(() => {
    if (!dialCode) return undefined;
    return findCountryByDialCode(dialCode);
  }, [dialCode]);

  // filter
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

  // keep this: computed E.164
  const combinedE164 = useMemo(
    () => (dialCode && phoneNumber ? `${dialCode}${phoneNumber}` : ""),
    [dialCode, phoneNumber]
  );

  useEffect(() => {
    if (setValue && name) {
      setValue(name, combinedE164, {
        shouldDirty: !!combinedE164,
        shouldValidate: touched, // <-- only validate after blur / user interaction
      });
    }
  }, [combinedE164, touched, name, setValue]);

  // choose country
  const handleCountrySelect = useCallback(
    (country: CountryCode) => {
      const newDialCode = country.dialCode;
      const currentNumber = value.includes("-") ? value.split("-")[1] : "";
      onChange(`${newDialCode}-${currentNumber}`);
      setIsOpen(false);
      setSearchQuery("");
    },
    [onChange, value]
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const digitsOnly = e.target.value.replace(/\D+/g, "").slice(0, MAX_LOCAL_DIGITS);
      setPhoneNumber(digitsOnly);
      onChange(`${dialCode || ""}-${digitsOnly}`);
    },
    [dialCode, onChange]
  );

  const handleBlur = useCallback(() => setTouched(true), []);

  const localInvalid =
    touched &&
    ((!dialCode && phoneNumber.length > 0) || // number entered but no code
      (phoneNumber.length > 0 && phoneNumber.length !== MAX_LOCAL_DIGITS)); // not 10 digits

  return (
    <div className={`relative ${className || ""}`}>
      <div className="flex w-full relative">
        <div className="relative z-10" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-between w-24 md:w-28 px-2 md:px-3 py-3 bg-gray-100 border ${
              error || localInvalid ? "border-red-500" : "border-gray-300"
            } border-r-0 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selectClassName || ""}`}
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
            <div className="absolute z-50 w-72 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg left-0 bottom-full max-h-[80vh] md:max-h-[400px] overflow-hidden">
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

              {!searchQuery && (
                <div className="sticky top-[56px] p-2 border-b bg-white z-10">
                  <p className="text-xs text-gray-500 mb-1">Popular</p>
                  <div className="grid grid-cols-4 gap-1">
                    {popularCountries.map(country => (
                      <button
                        key={country.code}
                        type="button"
                        className="flex flex-col items-center justify-center p-2 hover:bg-gray-100 rounded-md"
                        onClick={() => handleCountrySelect(country)}
                      >
                        <span className="text-lg">{country.flag}</span>
                        <span className="text-xs mt-1">{country.dialCode}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="max-h-[calc(80vh-120px)] md:max-h-60 overflow-y-auto overscroll-contain">
                {filteredCountries.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    className={`flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 ${
                      selectedCountry?.dialCode === country.dialCode ? "bg-gray-100" : ""
                    }`}
                    onClick={() => handleCountrySelect(country)}
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
          placeholder="Enter phone number"
          value={phoneNumber}
          onChange={handlePhoneChange}
          onBlur={handleBlur}
          maxLength={MAX_LOCAL_DIGITS}
          className={`flex-1 bg-gray-100 border border-l-0 rounded-r-lg py-3 pl-4 pr-4 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent ${
            error || localInvalid
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-indigo-500"
          } ${inputClassName || ""}`}
          aria-invalid={Boolean(error || localInvalid)}
        />

        {/* Hidden registered field that RHF/yup will validate */}
        {register && name ? (
          <input type="hidden" {...register(name)} value={combinedE164} readOnly />
        ) : null}
      </div>

      {/* lightweight inline hint */}
      {localInvalid && (
        <p className="text-red-500 text-[10px] mt-1">
          {!dialCode && phoneNumber.length > 0
            ? "Please select a country code."
            : "Phone number must be 10 digits."}
        </p>
      )}
    </div>
  );
};

export default memo(CountryCodeSelector);
