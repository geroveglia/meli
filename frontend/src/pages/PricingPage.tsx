import React, { useState, useEffect } from "react";
import { Footer } from "../components/Footer";
import { brandingService, BrandingSettings } from "../services/brandingService";
import { motion } from "framer-motion";

export const PricingPage: React.FC = () => {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);

  useEffect(() => {
    brandingService.getBranding().then(setBranding).catch(console.error);
  }, []);

  const plans = [
    {
      name: "Individual plan",
      price: "$0/month",
      badge: "Public preview",
      description: "A plan for anyone who wants to build.",
      buttonText: "Download",
      buttonVariant: "dark", // dark background, white text
      features: [],
    },
    {
      name: "Developer plan",
      subName: "via Google One",
      badge: "Recommended",
      description: "Leverage Antigravity as your daily driver via your Google AI Pro or Ultra subscription.",
      buttonText: "Download",
      secondaryButtonText: "Get plan",
      buttonVariant: "dark",
      features: [],
    },
    {
      name: "Team plan",
      subName: "via Google Workspace",
      badge: "Preview",
      description: "For software development teams, higher rate limits via Google Workspace AI Ultra for Business.",
      buttonText: "Download",
      secondaryButtonText: "Get plan",
      buttonVariant: "dark",
      features: [],
    },
    {
      name: "Organization plan",
      subName: "via Google Cloud",
      badge: "Coming soon",
      description: "Fully enterprise-grade solution for organizations at scale.",
      buttonText: "Notify me",
      buttonVariant: "light", // light background, dark text
      features: [],
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-black selection:text-white">
      <main className="pt-32 pb-20 px-4 container mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-black mb-4">
            Choose the perfect plan <br /> for your journey
          </h1>
        </motion.div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="bg-[#F8F9FA] rounded-[2rem] p-8 flex flex-col h-full relative"
            >
              {/* Badge */}
              <div className="mb-4">
                <span className="inline-block px-3 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-600">
                  {plan.badge}
                </span>
              </div>

              {/* Title & Price */}
              <h3 className="text-2xl font-medium text-black mb-1">{plan.name}</h3>
              {plan.price && <p className="text-lg text-gray-600 mb-4">{plan.price}</p>}
              {plan.subName && <p className="text-lg text-gray-600 mb-4">{plan.subName}</p>}

              {/* Description */}
              <p className="text-gray-600 text-sm leading-relaxed mb-8 flex-grow">
                {plan.description}
              </p>

              {/* Buttons */}
              <div className="mt-auto space-y-3">
                <button
                  className={`w-full py-3 px-6 rounded-full font-medium transition-colors ${
                    plan.buttonVariant === "dark"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "bg-gray-200 text-black hover:bg-gray-300"
                  }`}
                >
                  {plan.buttonText}
                </button>
                {plan.secondaryButtonText && (
                  <button className="w-full py-3 px-6 rounded-full font-medium bg-gray-200 text-black hover:bg-gray-300 transition-colors">
                    {plan.secondaryButtonText}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <Footer branding={branding} />
      </main>
    </div>
  );
};
