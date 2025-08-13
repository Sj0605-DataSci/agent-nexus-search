import HomeHeader from "@/components/Homepage/Header";
import HeroSection from "@/components/Homepage/HeroSection";
import WhyChooseUs from "@/components/Homepage/WhyChooseUs";
import Footer from "@/components/Homepage/Footer";

export const dynamic = "force-static";

export default function Page() {
  return (
    <>
      <HomeHeader />
      <HeroSection />
      <WhyChooseUs />
      <Footer />
    </>
  );
}
