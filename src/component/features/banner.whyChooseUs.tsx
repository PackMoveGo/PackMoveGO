
import React from 'react';
import { styles } from "../../styles/common";
import Feature from "./Feature";
import { api } from "../../services/service.apiSW";

interface FeatureData {
  id: number;
  icon: string;
  title: string;
  description: string;
}

const features: FeatureData[] = [
  {
    id: 1,
    icon: "⭐",
    title: "5-Star Rated",
    description: "Consistently high customer satisfaction with over 98% positive reviews"
  },
  {
    id: 2,
    icon: "🛡️",
    title: "Fully Insured",
    description: "Complete protection for your belongings with comprehensive coverage"
  },
  {
    id: 3,
    icon: "⚡",
    title: "Fast Service",
    description: "Quick and efficient moving process with experienced professionals"
  },
  {
    id: 4,
    icon: "💰",
    title: "Best Price",
    description: "Competitive and transparent pricing with no hidden fees"
  },
  {
    id: 5,
    icon: "📞",
    title: "24/7 Support",
    description: "Round-the-clock customer service for peace of mind"
  },
  {
    id: 6,
    icon: "🎯",
    title: "On-Time Guarantee",
    description: "We guarantee to arrive on time or your move is free"
  }
];

interface WhyChooseUsProps {
  customFeatures?: FeatureData[];
  totalMovesCount?: number;
  className?: string;
  isLoading?: boolean;
  error?: string | null;
}

export default function WhyChooseUs({ 
  customFeatures, 
  totalMovesCount = 500, 
  className = '',
  isLoading = false,
  error = null
}: WhyChooseUsProps) {
  const displayFeatures = customFeatures || features;
  
  // Determine what to display for total moves count
  const getTotalMovesDisplay = () => {
    if (isLoading) {
      return "Loading...";
    }
    if (error) {
      return "503+"; // Show 503+ when API is unavailable
    }
    return `${totalMovesCount}+`;
  };

  return (
    <div className={`${styles.section.default} bg-blue-600 text-white ${className}`}>
      <div className={styles.container}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose Pack Move Go?</h2>
            <p className="text-xl opacity-90">
              Experience the difference that professional, reliable moving services make
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-red-300">
                  {getTotalMovesDisplay()}
                </span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Successful Moves</h3>
              <p className="text-sm opacity-90">
                {error ? 
                  "Service temporarily unavailable - API error 503" : 
                  "We've helped hundreds of families and businesses relocate successfully"
                }
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">5★</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Customer Rating</h3>
              <p className="text-sm opacity-90">
                Our customers consistently rate us with 5-star reviews
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">24/7</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Support Available</h3>
              <p className="text-sm opacity-90">
                Round-the-clock customer support for peace of mind
              </p>
            </div>
            <div className="text-center">
              <div className="bg-white bg-opacity-20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold">100%</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Satisfaction Guarantee</h3>
              <p className="text-sm opacity-90">
                We're not satisfied until you're completely satisfied
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

WhyChooseUs.displayName = 'WhyChooseUs'; 