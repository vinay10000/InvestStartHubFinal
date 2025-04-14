import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckIcon, ZapIcon, WalletIcon } from "lucide-react";

const PaymentOptions = () => {
  return (
    <div className="bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-base font-semibold text-primary tracking-wide uppercase">Flexible Payments</h2>
          <p className="mt-1 text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight">
            Multiple Investment Options
          </p>
          <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
            Choose the investment method that works best for you.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          {/* Crypto Option */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8 sm:p-10 sm:pb-6">
              <div className="flex items-center justify-center h-20 w-20 rounded-md bg-accent-100 mx-auto">
                <ZapIcon className="h-12 w-12 text-accent-600" />
              </div>
              <div className="mt-5 text-center">
                <h3 className="text-2xl font-medium text-gray-900">Cryptocurrency</h3>
                <div className="mt-4 flex items-center justify-center">
                  <span className="px-3 flex items-start text-6xl tracking-tight text-gray-900">
                    <span className="mt-2 mr-2 text-4xl font-medium">ETH</span>
                  </span>
                </div>
                <p className="mt-5 text-lg text-gray-500">
                  Invest using Ethereum and other cryptocurrencies through your MetaMask wallet.
                </p>
              </div>
            </div>
            <div className="px-6 pt-6 pb-8 sm:p-10 sm:pt-6">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">Transparent blockchain transactions</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">Smart contract security</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">Global investment capabilities</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">No intermediaries or additional fees</p>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup?role=investor">
                  <Button className="w-full bg-accent hover:bg-accent/90">Connect MetaMask</Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Fiat Option */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8 sm:p-10 sm:pb-6">
              <div className="flex items-center justify-center h-20 w-20 rounded-md bg-secondary-100 mx-auto">
                <WalletIcon className="h-12 w-12 text-secondary-600" />
              </div>
              <div className="mt-5 text-center">
                <h3 className="text-2xl font-medium text-gray-900">Fiat Currency</h3>
                <div className="mt-4 flex items-center justify-center">
                  <span className="px-3 flex items-start text-6xl tracking-tight text-gray-900">
                    <span className="mt-2 mr-2 text-4xl font-medium">UPI</span>
                  </span>
                </div>
                <p className="mt-5 text-lg text-gray-500">
                  Invest using traditional banking methods with UPI for quick and secure transactions.
                </p>
              </div>
            </div>
            <div className="px-6 pt-6 pb-8 sm:p-10 sm:pt-6">
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">Fast bank transfers</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">Familiar payment process</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">QR code scanning for quick payments</p>
                </li>
                <li className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckIcon className="h-6 w-6 text-green-500" />
                  </div>
                  <p className="ml-3 text-base text-gray-700">Transaction ID verification system</p>
                </li>
              </ul>
              <div className="mt-8">
                <Link href="/signup?role=investor">
                  <Button className="w-full bg-secondary hover:bg-secondary/90">Use UPI Payment</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentOptions;
