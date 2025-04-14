import { 
  BanknoteIcon, 
  FileTextIcon, 
  MessageSquareIcon, 
  ClipboardCheckIcon 
} from "lucide-react";

const Features = () => {
  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-primary font-semibold tracking-wide uppercase">Features</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            A better way to connect founders and investors
          </p>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 lg:mx-auto">
            Our platform combines traditional investment tools with blockchain technology for maximum security and transparency.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            <div className="relative">
              <dt>
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <BanknoteIcon className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Multiple Payment Options</p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-500">
                Invest using cryptocurrency (via MetaMask) or traditional fiat currency (via UPI), giving you flexibility based on your preferences.
              </dd>
            </div>

            <div className="relative">
              <dt>
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <FileTextIcon className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Secure Document Sharing</p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-500">
                Share pitch decks, financial reports, and legal documents securely with potential investors using our encrypted storage system.
              </dd>
            </div>

            <div className="relative">
              <dt>
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <MessageSquareIcon className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Direct Messaging</p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-500">
                Communicate directly with founders or investors through our integrated messaging system, building relationships that go beyond transactions.
              </dd>
            </div>

            <div className="relative">
              <dt>
                <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary text-white">
                  <ClipboardCheckIcon className="h-6 w-6" />
                </div>
                <p className="ml-16 text-lg leading-6 font-medium text-gray-900">Transaction Tracking</p>
              </dt>
              <dd className="mt-2 ml-16 text-base text-gray-500">
                Track all your investments and funding rounds in one place with detailed analytics and reporting features.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

export default Features;
