import { 
  BanknoteIcon, 
  FileTextIcon, 
  MessageSquareIcon, 
  ClipboardCheckIcon,
  ShieldCheckIcon,
  TrendingUpIcon,
  CheckCircleIcon,
  GlobeIcon
} from "lucide-react";

const Features = () => {
  return (
    <section id="features" className="py-24 bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header with gradient underline */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-4">
            <CheckCircleIcon className="mr-2 h-4 w-4" />
            Enterprise-Grade Security
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 tracking-tight">
            Features built for modern investors
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-600">
            Our platform combines traditional investment tools with blockchain technology for maximum security and transparency.
          </p>
          <div className="mt-6 mx-auto w-32 h-1.5 bg-gradient-to-r from-indigo-600 to-blue-500 rounded-full"></div>
        </div>

        {/* Features grid with modern cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Feature 1 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-indigo-200">
              <BanknoteIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Multiple Payment Options</h3>
            <p className="text-gray-600">
              Invest using cryptocurrency (via MetaMask) or traditional fiat currency (via UPI), giving you flexibility based on your preferences.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-blue-200">
              <FileTextIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure Document Sharing</h3>
            <p className="text-gray-600">
              Share pitch decks, financial reports, and legal documents securely with potential investors using our encrypted storage system.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-cyan-200">
              <MessageSquareIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Direct Messaging</h3>
            <p className="text-gray-600">
              Communicate directly with founders or investors through our integrated messaging system, building relationships that go beyond transactions.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-teal-200">
              <ClipboardCheckIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Transaction Tracking</h3>
            <p className="text-gray-600">
              Track all your investments and funding rounds in one place with detailed analytics and reporting features.
            </p>
          </div>
          
          {/* Feature 5 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-emerald-200">
              <ShieldCheckIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Blockchain Security</h3>
            <p className="text-gray-600">
              Leverage blockchain technology for immutable transaction records and smart contracts that automatically execute investment terms.
            </p>
          </div>
          
          {/* Feature 6 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-green-500 to-lime-500 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-green-200">
              <TrendingUpIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Real-time Analytics</h3>
            <p className="text-gray-600">
              Access comprehensive dashboards with investment performance metrics, startup growth indicators, and market trends.
            </p>
          </div>
          
          {/* Feature 7 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-yellow-200">
              <CheckCircleIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Verified Startups</h3>
            <p className="text-gray-600">
              All startups on our platform undergo a thorough verification process to ensure legitimacy and reduce investment risks.
            </p>
          </div>
          
          {/* Feature 8 */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100 hover:shadow-lg hover:border-indigo-100 transition-all duration-200 hover:-translate-y-1">
            <div className="h-14 w-14 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-purple-200">
              <GlobeIcon className="h-7 w-7 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Global Investment</h3>
            <p className="text-gray-600">
              Connect with startups and investors from around the world, transcending geographical boundaries through our digital platform.
            </p>
          </div>
        </div>
        
        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-6">
            Join thousands of investors and founders already using our platform
          </p>
          <a href="#how-it-works" className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-full shadow-sm text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105">
            Learn How It Works
          </a>
        </div>
      </div>
    </section>
  );
};

export default Features;
