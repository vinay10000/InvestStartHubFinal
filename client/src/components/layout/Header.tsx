import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, User } from "lucide-react";

const Header = () => {
  const [location, navigate] = useLocation();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const getDashboardPath = () => {
    if (!user) return "/";
    return user.role === "founder" ? "/founder/dashboard" : "/investor/dashboard";
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <span className="text-primary font-bold text-xl cursor-pointer">StartupConnect</span>
              </Link>
            </div>
            <nav className="hidden sm:ml-6 sm:flex sm:space-x-8" aria-label="Global">
              <Link href="/">
                <span className={`${location === "/" ? "border-primary text-gray-900" : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium cursor-pointer`}>
                  Home
                </span>
              </Link>
            </nav>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link href={getDashboardPath()}>
                  <Button variant="ghost">Dashboard</Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="p-0">
                      <Avatar className="h-8 w-8">
                        {user.profilePicture ? (
                          <AvatarImage src={user.profilePicture} alt={user.username} />
                        ) : (
                          <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                        )}
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/transactions")}>
                      <span>Transactions</span>
                    </DropdownMenuItem>
                    {user.role === "founder" && (
                      <DropdownMenuItem onClick={() => navigate("/founder/dashboard")}>
                        <span>My Startups</span>
                      </DropdownMenuItem>
                    )}
                    {user.role === "investor" && (
                      <DropdownMenuItem onClick={() => navigate("/investor/dashboard")}>
                        <span>Discover Startups</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate("/chat")}>
                      <span>Messages</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link href="/signin">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open main menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <div className="flex flex-col space-y-4 mt-4">
                  <Link href="/">
                    <span className={`${location === "/" ? "bg-primary-50 border-primary-500 text-primary-700" : "border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700"} block pl-3 pr-4 py-2 border-l-4 text-base font-medium cursor-pointer`} onClick={() => setIsOpen(false)}>
                      Home
                    </span>
                  </Link>
                  
                  {user ? (
                    <>
                      <div className="border-t border-gray-200 pt-4 pb-3">
                        <div className="flex items-center px-4">
                          <div className="flex-shrink-0">
                            <Avatar className="h-10 w-10">
                              {user.profilePicture ? (
                                <AvatarImage src={user.profilePicture} alt={user.username} />
                              ) : (
                                <AvatarFallback>{getInitials(user.username)}</AvatarFallback>
                              )}
                            </Avatar>
                          </div>
                          <div className="ml-3">
                            <div className="text-base font-medium text-gray-800">{user.username}</div>
                            <div className="text-sm font-medium text-gray-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1">
                          <Link href="/profile">
                            <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer" onClick={() => setIsOpen(false)}>
                              Profile
                            </span>
                          </Link>
                          <Link href="/transactions">
                            <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer" onClick={() => setIsOpen(false)}>
                              Transactions
                            </span>
                          </Link>
                          {user.role === "founder" ? (
                            <Link href="/founder/dashboard">
                              <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer" onClick={() => setIsOpen(false)}>
                                My Startups
                              </span>
                            </Link>
                          ) : (
                            <Link href="/investor/dashboard">
                              <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer" onClick={() => setIsOpen(false)}>
                                Discover Startups
                              </span>
                            </Link>
                          )}
                          <Link href="/chat">
                            <span className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 cursor-pointer" onClick={() => setIsOpen(false)}>
                              Messages
                            </span>
                          </Link>
                          <button 
                            className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                            onClick={() => {
                              handleSignOut();
                              setIsOpen(false);
                            }}
                          >
                            Sign out
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="pt-4 flex flex-col space-y-3">
                      <Link href="/signin">
                        <Button variant="outline" className="w-full" onClick={() => setIsOpen(false)}>Sign in</Button>
                      </Link>
                      <Link href="/signup">
                        <Button className="w-full" onClick={() => setIsOpen(false)}>Get Started</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
