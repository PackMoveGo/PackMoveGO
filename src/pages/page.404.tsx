
import { FC, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SEO from '../component/business/SEO';
import QuoteForm from '../component/forms/form.quote';
import { FormData } from '../component/forms/form.quote';
import { getCurrentDate } from '../util/ssrUtils';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const Page404: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();


  useEffect(() => {
    // Log 404 for analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: '404 - Page Not Found',
        page_location: location.pathname
      });
    }
    
    // Debug logging
    console.log('404 Page rendered for path:', location.pathname);
    console.log('Current location:', location);
  }, [location.pathname]);

  // Popular pages to suggest
  const popularPages = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/services', label: 'Services', icon: '🚚' },
    { path: '/supplies', label: 'Supplies', icon: '📦' },
    { path: '/locations', label: 'Locations', icon: '📍' },
    { path: '/review', label: 'Reviews', icon: '⭐' },
    { path: '/contact', label: 'Contact', icon: '📞' }
  ];

  // Common 404 scenarios and suggestions
  const getSuggestions = () => {
    const path = location.pathname.toLowerCase();
    
    if (path.includes('service')) {
      return {
        title: 'Looking for Services?',
        description: 'Explore our comprehensive moving and packing services.',
        link: { path: '/services', label: 'View Services', icon: '🚚' }
      };
    }
    
    if (path.includes('supply') || path.includes('box') || path.includes('pack')) {
      return {
        title: 'Looking for Supplies?',
        description: 'Find all the moving supplies you need for your move.',
        link: { path: '/supplies', label: 'View Supplies', icon: '📦' }
      };
    }
    
    if (path.includes('location') || path.includes('area') || path.includes('city')) {
      return {
        title: 'Looking for Locations?',
        description: 'Find our services in your area.',
        link: { path: '/locations', label: 'Find Locations', icon: '📍' }
      };
    }
    
    if (path.includes('review') || path.includes('testimonial')) {
      return {
        title: 'Looking for Reviews?',
        description: 'See what our customers are saying about us.',
        link: { path: '/review', label: 'Read Reviews', icon: '⭐' }
      };
    }
    
    return null;
  };

  const suggestion = getSuggestions();

  // Handle quote form submission
  const handleQuoteSubmit = (data: FormData) => {
    console.log('Quote submitted from 404 page:', data);
    // Navigate to booking page after submission
    navigate('/booking');
  };

  return (
    <div>
      <SEO 
        title="404 - Page Not Found | Pack Move Go"
        description="The page you're looking for doesn't exist. Return to our homepage for professional moving and packing services."
        keywords="404, page not found, moving services, packing services"
      />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl w-full">
          {/* Main 404 Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="mb-8">
              <div className="text-9xl font-bold text-gray-800 leading-none mb-4">404</div>
              <div className="w-32 h-2 bg-gradient-to-r from-blue-600 to-indigo-600 mx-auto rounded-full"></div>
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Oops! Page Not Found
            </h2>
            
            <p className="text-gray-600 mb-8 text-lg leading-relaxed max-w-md mx-auto">
              The page you're looking for doesn't exist or has been moved. 
              Don't worry, we're here to help you find what you need!
            </p>
            
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link
                to="/"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                🏠 Return Home
              </Link>
              
              <Link
                to="/contact"
                className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold text-lg"
              >
                📞 Contact Support
              </Link>
            </div>
          </div>

          {/* Popular Pages Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Popular Pages You Might Like
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {popularPages.map((page) => (
                <Link
                  key={page.path}
                  to={page.path}
                  className="group bg-gray-50 hover:bg-blue-50 rounded-lg p-4 text-center transition-all duration-200 hover:shadow-md transform hover:-translate-y-1"
                >
                  <div className="text-2xl mb-2">{page.icon}</div>
                  <div className="font-medium text-gray-900 group-hover:text-blue-600">
                    {page.label}
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Smart Suggestion Section */}
          {suggestion && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-xl p-8 mb-8 border-l-4 border-blue-500">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {suggestion.title}
              </h3>
              
              <p className="text-gray-600 mb-6">
                {suggestion.description}
              </p>
              
              <Link
                to={suggestion.link.path}
                className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                <span className="mr-2">{suggestion.link.icon}</span>
                {suggestion.link.label}
              </Link>
            </div>
          )}

          {/* Search Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Can't Find What You're Looking For?
            </h3>
            
            <p className="text-gray-600 mb-6">
              Try searching our site or browse our services to find what you need.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/services"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
              >
                🚚 View Our Services
              </Link>
              
              <Link
                to="/locations"
                className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium"
              >
                📍 Find Your Location
              </Link>
            </div>
          </div>

          {/* Helpful Tips */}
          <div className="bg-yellow-50 rounded-2xl shadow-xl p-8 mb-8 border-l-4 border-yellow-400">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              💡 Helpful Tips
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span className="text-gray-700">Check the URL spelling in your browser's address bar</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span className="text-gray-700">Use our navigation menu to find the page you need</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span className="text-gray-700">Contact us if you believe this is an error</span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-600 mr-2">•</span>
                <span className="text-gray-700">Try refreshing the page or clearing your browser cache</span>
              </div>
            </div>
          </div>

          {/* Quote Form Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                🚚 Ready to Move? Get a Free Quote!
              </h3>
              <p className="text-gray-600">
                Even though you found our 404 page, we're still here to help with your move!
              </p>
            </div>
            <QuoteForm onSubmit={handleQuoteSubmit} />
          </div>

          {/* Debug Info */}
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500 mb-2">
              <strong>Debug Info:</strong> URL: {location.pathname}
            </p>
            <p className="text-xs text-gray-400">
              Rendered at {getCurrentDate().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page404; 