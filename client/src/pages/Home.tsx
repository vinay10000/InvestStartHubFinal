import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import FeaturedStartups from "@/components/home/FeaturedStartups";
import HowItWorks from "@/components/home/HowItWorks";
import PaymentOptions from "@/components/home/PaymentOptions";
import CTASection from "@/components/home/CTASection";

const Home = () => {
  return (
    <div>
      <Hero />
      <Features />
      <FeaturedStartups />
      <HowItWorks />
      <PaymentOptions />
      <CTASection />
    </div>
  );
};

export default Home;
