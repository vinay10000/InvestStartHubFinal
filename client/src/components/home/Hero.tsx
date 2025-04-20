import { Link } from "wouter";
import { ArrowRight, Sparkles, ChevronDown, Wallet, BarChart, Shield } from "lucide-react";

const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-background">
      {/* Background with shapes */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-gray-900 z-0"></div>
      <div className="absolute inset-0 opacity-20 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgTCAwIDQwIiBmaWxsPSJub25lIiBzdHJva2U9IiNkZGRkZGQiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
      </div>
      
      {/* Colorful blurred shapes */}
      <div className="absolute top-40 -left-10 w-80 h-80 bg-gradient-to-br from-blue-500/30 to-purple-500/20 rounded-full filter blur-[80px] opacity-40 animate-blob"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-bl from-cyan-400/30 to-indigo-400/20 rounded-full filter blur-[100px] opacity-30 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-tr from-emerald-400/20 to-teal-300/30 rounded-full filter blur-[80px] opacity-30 animate-blob animation-delay-4000"></div>
      
      {/* No navbar here - using the main Header component instead */}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 min-h-[90vh] items-center py-12 md:py-20">
          {/* Left content */}
          <div className="space-y-8 max-w-xl">
            {/* Tech badge */}
            <div className="inline-flex items-center rounded-full border border-indigo-600/20 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-400/30 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-300 transition-all animate-fadeIn">
              <Sparkles className="h-4 w-4 mr-2 text-indigo-500 dark:text-indigo-300" />
              <span>Blockchain Powered Investment Platform</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-gray-100 animate-fadeIn">
              <span className="block">Connect Startups with</span>
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-transparent bg-clip-text">Investors Securely</span>
            </h1>
            
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl animate-fadeIn animation-delay-200">
              A modern platform bringing transparency and trust to startup investments. Connect your wallet, showcase your startup, or discover the next big innovation with our secure blockchain technology.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 animate-fadeIn animation-delay-400">
              <Link href="/signup?role=founder">
                <button className="inline-flex items-center justify-center px-6 py-4 text-base font-medium rounded-full text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 shadow-md shadow-indigo-600/25 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105">
                  For Startups
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </Link>
              
              <Link href="/signup?role=investor">
                <button className="inline-flex items-center justify-center px-6 py-4 text-base font-medium rounded-full text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 shadow-sm backdrop-blur-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700">
                  For Investors
                </button>
              </Link>
            </div>
            
            {/* Stats with modern animated cards */}
            <div className="grid grid-cols-3 gap-4 pt-6 animate-fadeIn animation-delay-600">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-700 transition-all duration-200">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-transparent bg-clip-text">500+</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Startups</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-700 transition-all duration-200">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-transparent bg-clip-text">₹25M+</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Invested</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-700 transition-all duration-200">
                <div className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 text-transparent bg-clip-text">1000+</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Investors</div>
              </div>
            </div>
            
            {/* Scroll indicator */}
            <div className="pt-8 hidden md:flex justify-center animate-bounce">
              <a href="#features" className="flex flex-col items-center text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                <span className="text-sm mb-1">Scroll to learn more</span>
                <ChevronDown className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          {/* Right content: 3D Illustration with cards */}
          <div className="relative lg:block animate-fadeIn animation-delay-800 mt-8 lg:mt-0">
            {/* Main elevated card with shadow */}
            <div className="relative z-20 bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700 transition-all transform lg:translate-y-6 lg:translate-x-6">
              <div className="aspect-w-4 aspect-h-3">
                <img
                  className="w-full h-full object-cover"
                  src="https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1740&q=80"
                  alt="Tech startup team collaborating"
                />
              </div>
              <div className="p-6">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">Startup Success Stories</h3>
                <p className="text-gray-600 dark:text-gray-300 text-sm">See how companies like yours have grown with secure blockchain investments.</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm">JD</div>
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm">SR</div>
                    <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm">AT</div>
                  </div>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">View Stories</span>
                </div>
              </div>
            </div>
            
            {/* Feature cards in absolute position */}
            <div className="absolute top-4 -right-2 md:-right-6 z-10 w-48 max-w-full">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center mb-3">
                  <Wallet className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Wallet Integration</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Seamlessly connect your MetaMask wallet for secure transactions</p>
              </div>
            </div>
            
            <div className="absolute -bottom-2 md:-bottom-6 left-4 md:left-0 z-10 w-52 max-w-full">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center mb-3">
                  <BarChart className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Investment Analytics</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Track performance with real-time analytics dashboard</p>
              </div>
            </div>
            
            <div className="absolute top-1/2 transform -translate-y-1/2 -left-2 md:-left-6 z-10 w-48 max-w-full">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700">
                <div className="flex items-center mb-3">
                  <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mr-2" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Secure Platform</h4>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">Blockchain verification for complete transparency</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
