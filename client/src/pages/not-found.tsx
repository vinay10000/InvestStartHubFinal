import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-6">404</h1>
        <h2 className="text-2xl font-medium mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/">
            <Button size="lg">
              Return Home
            </Button>
          </Link>
          <Link href="/startups">
            <Button variant="outline" size="lg">
              Browse Startups
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}