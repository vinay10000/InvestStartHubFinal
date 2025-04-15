import { Link } from "wouter";
import { ArrowRight, Sparkles } from "lucide-react";

const Hero = () => {
  return (
    <div className="relative overflow-hidden bg-black text-white">
      {/* Background gradient and noise effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-slate-900 to-black"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI3NjgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGZpbHRlciBpZD0ibm9pc2UiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ibWF0cml4IiB2YWx1ZXM9IjAuMyAwLjMgMC4zIDAgMCAwLjMgMC4zIDAuMyAwIDAgMC4zIDAuMyAwLjMgMCAwIDAgMCAwIDEgMCIvPjwvZmlsdGVyPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjA1Ii8+PC9zdmc+')] opacity-50"></div>
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-blue-500 rounded-full filter blur-[128px] opacity-20"></div>
      <div className="absolute bottom-1/3 right-10 w-80 h-80 bg-purple-500 rounded-full filter blur-[128px] opacity-20"></div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 min-h-[80vh] items-center py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto lg:mx-0 space-y-8">
            {/* Tech badge */}
            <div className="inline-flex items-center rounded-full border border-indigo-600/30 bg-indigo-600/10 px-4 py-1 text-sm text-indigo-300 backdrop-blur-md">
              <Sparkles className="h-4 w-4 mr-2" />
              <span>Blockchain Powered Investment Platform</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight">
              <span className="block">Connect Startups with</span>{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-sky-500 text-transparent bg-clip-text">Investors Securely</span>
            </h1>
            
            <p className="text-lg text-slate-300 max-w-xl">
              A decentralized platform that brings transparency and trust to startup investments. Connect your wallet, showcase your startup, or discover the next big innovation.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup?role=founder">
                <span className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-900/30 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:shadow-lg">
                  For Startups
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Link>
              
              <Link href="/signup?role=investor">
                <span className="inline-flex items-center justify-center px-6 py-3 text-base font-medium rounded-md text-white bg-transparent hover:bg-white/10 border border-white/20 backdrop-blur-sm cursor-pointer transition-colors duration-200">
                  For Investors
                </span>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 text-transparent bg-clip-text">500+</div>
                <div className="text-sm text-slate-400 mt-1">Startups</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 text-transparent bg-clip-text">₹25M+</div>
                <div className="text-sm text-slate-400 mt-1">Invested</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 text-transparent bg-clip-text">1000+</div>
                <div className="text-sm text-slate-400 mt-1">Investors</div>
              </div>
            </div>
          </div>
          
          {/* Image with glassmorphism card */}
          <div className="relative lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 rounded-2xl filter blur-3xl opacity-30"></div>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl shadow-black/20">
              <img
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1740&q=80"
                alt="Startup team collaborating"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
              
              {/* Floating glassmorphism card */}
              <div className="absolute bottom-6 left-6 right-6 p-6 rounded-xl bg-white/10 border border-white/10 backdrop-blur-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold">SC</div>
                  <div>
                    <h3 className="text-white font-semibold">StartupConnect</h3>
                    <p className="text-sm text-slate-300">Connect, invest, and grow with innovative startups all around the world.</p>
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

export default Hero;
