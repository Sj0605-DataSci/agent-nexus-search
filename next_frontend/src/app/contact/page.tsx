import TaraFooter from "../tara/components/TaraFooter";
import ContactHero from "./components/ContactHero";
import ContactForm from "./components/ContactForm";
import ContactInfo from "./components/ContactInfo";
import Navbar from "../tara/components/Navbar";

const ContactPage = () => {
  return (
    <main className="">
      <Navbar />
      <div className="bg-gradient-to-br pt-12  md:pt-22 from-gray-50 via-blue-50/30 to-indigo-50/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(59,130,246,0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(99,102,241,0.06),transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid w-full grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
            <ContactHero />
            <ContactForm />
            <ContactInfo />
          </div>
        </div>
      </div>
      <div className="relative">
        <TaraFooter />
      </div>
    </main>
  );
};

export default ContactPage;
