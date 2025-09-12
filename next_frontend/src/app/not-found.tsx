import Link from "next/link";
import Image from "next/image";
import Header from "@/components/Homepage/Navbar";
import NewFooter from "@/components/Footer/NewFooter";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main
        className="flex-grow flex flex-col items-center justify-center bg-gray-50 px-6 py-16"
        role="main"
        aria-labelledby="notfound-title"
      >
        <div className="flex flex-col items-center max-w-2xl w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100">
          <Image
            src="/NotFoundPage.svg"
            alt="Page not found"
            width={350}
            height={350}
            priority
            className="mb-8"
          />

          <h1 id="notfound-title" className="text-5xl font-bold text-gray-900 mb-4">
            404
          </h1>

          <p className="text-xl text-gray-600 mb-6 max-w-md text-center">
            Oops! The page you are looking for does not exist or has been moved.
          </p>

          <div className="flex justify-center w-full mb-8">
            <div className="h-0.5 w-24 bg-gray-200 rounded-full"></div>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 transition w-full sm:w-auto"
          >
            Return to Home
          </Link>
        </div>
      </main>
      <NewFooter />
    </div>
  );
}
