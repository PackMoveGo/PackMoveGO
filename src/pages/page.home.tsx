import React, { lazy, Suspense } from 'react'; // Added missing import
import { useGiveSectionId } from '../hook/useGiveSectionId';
import { getHomePageData, getHomePageStatusCode, getHomePageFailedEndpoints, HomePageServiceData } from '../services/public/service.homePageAPI';
// Modal state is handled by Layout component
// import SEO from '../component/business/SEO'; // SEO complation
// const { getSectionProps, isTampered, SectionWarning } = useGiveSectionId(contactPageSections); Hash validation example implmintation

// Lazy load Hero component
const Hero = lazy(() => import('../component/pages/hero.home'));
const OurServices = lazy(() => import('../component/business/services/banner.ourServices'));
const Testimonials = lazy(() => import('../component/testimonials/banner.testimonials'));
const WhyChooseUs = lazy(() => import('../component/features/banner.whyChooseUs'));
const ServiceAreas = lazy(() => import('../component/service-areas/banner.serviceAreas'));
const DownloadApps = lazy(() => import('../component/ui/banner.downloadApps'));
const Statistics = lazy(() => import('../component/business/marketing/banner.statistics'));
const ProcessSteps = lazy(() => import('../component/business/marketing/banner.processSteps'));
const RecentMoves = lazy(() => import('../component/business/marketing/banner.recentMoves'));
const EmergencyContact = lazy(() => import('../component/business/contact/banner.emergencyContact'));
const FAQ = lazy(() => import('../component/pages/banner.FAQ'));
const FinalCTA = lazy(() => import('../component/business/marketing/banner.finalCTA'));

// Add displayName to lazy components
(Hero as any).displayName='Hero';
(OurServices as any).displayName='OurServices';
(Testimonials as any).displayName='Testimonials';
(WhyChooseUs as any).displayName='WhyChooseUs';
(ServiceAreas as any).displayName='ServiceAreas';
(DownloadApps as any).displayName='DownloadApps';
(Statistics as any).displayName='Statistics';
(ProcessSteps as any).displayName='ProcessSteps';
(RecentMoves as any).displayName='RecentMoves';
(EmergencyContact as any).displayName='EmergencyContact';
(FAQ as any).displayName='FAQ';
(FinalCTA as any).displayName='FinalCTA';

export default function HomePage(){
  // Check if we're in SSR mode
  const isSSR = typeof window === 'undefined';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // State for home page data - initialize with SSR-safe defaults
  const [homePageData, setHomePageData] = React.useState<HomePageServiceData | null>(null);
  const [isLoadingData, setIsLoadingData] = React.useState(false); // Never show loading during SSR
  const [dataError, setDataError] = React.useState<string | null>(null);
  const [statusCode, setStatusCode] = React.useState<number>(200);
  
  // Modal state is handled by Layout component
  
  // Load home page data using service pattern
  const loadHomePageData = async () => {
    // Skip API calls during SSR
    if (isSSR) {
      return;
    }
    
    setIsLoadingData(true);
    setDataError(null);
    setStatusCode(200);
    
    try {
      // Use the home page service data function
      const data = await getHomePageData();
      
      // Check if the data contains 503 error information
      if (data && (data as any).error && (data as any).is503Error) {
        setStatusCode(503);
        setDataError('503 Service Unavailable');
        setHomePageData(null);
        return;
      }
      
      setHomePageData(data);
      setStatusCode(200);
      
      // Check if there are any errors and set appropriate states
      const hasErrors = !data.services || !data.testimonials || !data.recentMoves || !data.nav || !data.authStatus;
      if (hasErrors) {
        setDataError('503 Service Unavailable');
        setStatusCode(503);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      
      // Check if this is a 503 error
      if (error instanceof Error && (error as any).is503Error) {
        setStatusCode(503);
        setDataError('503 Service Unavailable');
      } else {
        setDataError(errorMessage);
        setStatusCode(500);
      }
      
      // Modal will be handled by middleware automatically
    } finally {
      setIsLoadingData(false);
    }
  };

  // Call load data on component mount (client-side only)
  React.useEffect(() => {
    if (!isSSR) {
      loadHomePageData();
    }
  }, [isSSR]);

  // Modal state is handled by Layout component
  
  // SSR-safe section props
  let getSectionProps;
  try {
    const sectionHook = useGiveSectionId();
    getSectionProps = sectionHook.getSectionProps;
  } catch (error) {
    // Fallback for SSR when hook is not available
    getSectionProps = (id: string) => ({ id });
  }

  // Determine if we should show services in Hero (SSR-safe)
  const shouldShowServicesInHero = isSSR ? true : homePageData?.services;
  
  // Transform services data for components (SSR-safe with fallbacks)
  const servicesData = isSSR ? [] : (homePageData?.services?.services || []);
  const recentMovesData = isSSR ? [] : (homePageData?.recentMoves?.recentMoves || homePageData?.recentMoves?.moves || []);
  const testimonialsData = isSSR ? [] : (homePageData?.testimonials?.testimonials || []);
  const totalMoves = isSSR ? 0 : (recentMovesData.length || 0);
  const totalMovesCount = isSSR ? 500 : (homePageData?.totalMoves || 500);

  // Always render content - no loading state that blocks navigation

  return (
    <div className="min-h-screen bg-white">
        {/* Hero Section (above the fold) - Lazy loaded with Suspense */}
        <section {...getSectionProps('hero')}>
          <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Loading Hero...</h2>
                <p className="text-gray-600">Please wait while we load the hero section</p>
              </div>
            </div>
          }>
            <Hero 
              services={shouldShowServicesInHero ? servicesData : []} 
              isLoading={isLoadingData && !isSSR} 
              error={dataError} 
            />
          </Suspense>
        </section>

        {/* Emergency Contact Section */}
        <section {...getSectionProps('emergency-contact')}>
          <EmergencyContact />
        </section>

        {/* Statistics Section */}
        <section {...getSectionProps('statistics')}>
          <Statistics 
            totalMoves={totalMoves}
            isLoading={isLoadingData && !isSSR}
            error={dataError}
          />
        </section>

        {/* Services Section - Show when API data is available */}
        {shouldShowServicesInHero && (
          <section {...getSectionProps('services')}>
            <OurServices 
              services={servicesData}
              isLoading={isLoadingData && !isSSR}
              error={dataError}
            />
          </section>
        )}

        {/* Process Steps Section */}
        <section {...getSectionProps('process-steps')}>
          <ProcessSteps />
        </section>

        {/* Our Services Section */}
        <section {...getSectionProps('services')}>
          <OurServices 
            services={servicesData}
            isLoading={isLoadingData && !isSSR}
            error={dataError}
          />
        </section>

        {/* Testimonials Section */}
        <section {...getSectionProps('testimonials')}>
          <Testimonials 
            testimonials={testimonialsData}
            isLoading={isLoadingData && !isSSR}
            error={dataError}
          />
        </section>

        {/* Recent Moves Section */}
        <section {...getSectionProps('recent-moves')}>
          <RecentMoves 
            recentMoves={recentMovesData}
            isLoading={isLoadingData && !isSSR}
            error={dataError}
          />
        </section>

        {/* Why Choose Us Section */}
        <section {...getSectionProps('why-choose-us')}>
          <WhyChooseUs 
            totalMovesCount={totalMovesCount}
            isLoading={isLoadingData && !isSSR}
            error={dataError}
          />
        </section>

        {/* Service Areas Section */}
        <section {...getSectionProps('service-areas')}>
          <ServiceAreas 
            error={dataError}
          />
        </section>

        {/* FAQ Section */}
        <section {...getSectionProps('faq')}>
          <FAQ />
        </section>

        {/* Download Apps Section */}
        <section {...getSectionProps('download-apps')}>
          <DownloadApps />
        </section>

        {/* Final CTA Section */}
        <section {...getSectionProps('final-cta')}>
          <FinalCTA />
        </section>
        
    </div>
  );
}

// Add displayName for React DevTools
HomePage.displayName='HomePage'; 