import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const CTASection = () => {
  return (
    <div className="bg-primary-700">
      <div className="max-w-2xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          <span className="block">Ready to transform your startup journey?</span>
          <span className="block">Start connecting today.</span>
        </h2>
        <p className="mt-4 text-lg leading-6 text-primary-200">
          Whether you're a startup founder seeking investment or an investor looking for the next big opportunity, our platform brings you together in a secure and transparent environment.
        </p>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-md shadow">
            <Link href="/signup">
              <Button variant="secondary" size="lg">
                Create Account
              </Button>
            </Link>
          </div>
          <div className="ml-3 inline-flex">
            <Link href="/how-it-works">
              <Button variant="outline" className="text-white border-white hover:bg-primary-800" size="lg">
                Learn more
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTASection;
