const HowItWorks = () => {
  return (
    <div className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary tracking-wide uppercase">Process</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            How It Works
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            Our platform simplifies the investment process for both startups and investors.
          </p>
        </div>

        <div className="mt-16">
          <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
            <div className="relative">
              <div className="relative mx-auto rounded-lg shadow-lg overflow-hidden">
                <img 
                  className="object-cover w-full" 
                  src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80" 
                  alt="Startup team working" 
                />
              </div>
            </div>
            <div className="mt-10 lg:mt-0">
              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">For Startup Founders</h3>
              <div className="mt-10 space-y-10">
                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                    <span className="text-xl font-bold">1</span>
                  </div>
                  <div className="ml-16">
                    <h4 className="text-lg leading-6 font-medium text-gray-900">Create Your Profile</h4>
                    <p className="mt-2 text-base text-gray-500">
                      Sign up, verify your identity, and create a detailed profile for your startup, including your vision, team, and funding requirements.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                    <span className="text-xl font-bold">2</span>
                  </div>
                  <div className="ml-16">
                    <h4 className="text-lg leading-6 font-medium text-gray-900">Upload Documents</h4>
                    <p className="mt-2 text-base text-gray-500">
                      Share your pitch deck, financial reports, and legal documents securely through our platform for potential investors to review.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                    <span className="text-xl font-bold">3</span>
                  </div>
                  <div className="ml-16">
                    <h4 className="text-lg leading-6 font-medium text-gray-900">Connect & Receive Funding</h4>
                    <p className="mt-2 text-base text-gray-500">
                      Engage with interested investors through our messaging system, track investments, and manage your funding rounds all in one place.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-24">
            <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-center">
              <div className="lg:order-2">
                <div className="relative mx-auto rounded-lg shadow-lg overflow-hidden">
                  <img 
                    className="object-cover w-full" 
                    src="https://images.unsplash.com/photo-1579621970795-87facc2f976d?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80" 
                    alt="Investors in meeting" 
                  />
                </div>
              </div>
              <div className="mt-10 lg:mt-0 lg:order-1">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight sm:text-3xl">For Investors</h3>
                <div className="mt-10 space-y-10">
                  <div className="relative">
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-accent text-white">
                      <span className="text-xl font-bold">1</span>
                    </div>
                    <div className="ml-16">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">Browse Opportunities</h4>
                      <p className="mt-2 text-base text-gray-500">
                        Explore a curated list of startups seeking investment, filtered by industry, stage, or investment size to match your investment strategy.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-accent text-white">
                      <span className="text-xl font-bold">2</span>
                    </div>
                    <div className="ml-16">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">Connect Your Wallet</h4>
                      <p className="mt-2 text-base text-gray-500">
                        Link your MetaMask wallet for crypto investments or use traditional payment methods like UPI for fiat currency investments.
                      </p>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-accent text-white">
                      <span className="text-xl font-bold">3</span>
                    </div>
                    <div className="ml-16">
                      <h4 className="text-lg leading-6 font-medium text-gray-900">Invest & Track</h4>
                      <p className="mt-2 text-base text-gray-500">
                        Make secure investments and track your portfolio performance through our comprehensive dashboard with real-time updates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
