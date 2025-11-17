"use client";

import { Button } from "@/components/ui/button";
import { Check, Zap, Coins } from "lucide-react";

export function PricingContent() {
  const subscriptionPlans = [
    {
      name: "Monthly",
      type: "subscription",
      price: "$10",
      period: "per month",
      duration: "1 month",
      totalPrice: "$10",
      monthlyPrice: "$10.00",
      tokens: 30,
      tokensPerMonth: 30,
      savings: null,
      features: [
        "30 tokens per month",
        "1 generation per token",
        "3 revisions per generation",
        "Rollover unused tokens",
        "Priority support",
        "Cancel anytime",
      ],
      cta: "Subscribe Now",
      highlighted: false,
      icon: Zap,
    },
    {
      name: "3 Months",
      type: "subscription",
      price: "$28",
      period: "total",
      duration: "3 months",
      totalPrice: "$28",
      monthlyPrice: "$9.33",
      tokens: 90,
      tokensPerMonth: 30,
      savings: "$2",
      features: [
        "90 tokens total (30/month)",
        "1 generation per token",
        "3 revisions per generation",
        "Rollover unused tokens",
        "Priority support",
        "Save $2 vs monthly",
      ],
      cta: "Subscribe Now",
      highlighted: true,
      icon: Zap,
    },
    {
      name: "6 Months",
      type: "subscription",
      price: "$55",
      period: "total",
      duration: "6 months",
      totalPrice: "$55",
      monthlyPrice: "$9.17",
      tokens: 180,
      tokensPerMonth: 30,
      savings: "$5",
      features: [
        "180 tokens total (30/month)",
        "1 generation per token",
        "3 revisions per generation",
        "Rollover unused tokens",
        "Priority support",
        "Save $5 vs monthly",
      ],
      cta: "Subscribe Now",
      highlighted: false,
      icon: Zap,
    },
    {
      name: "1 Year",
      type: "subscription",
      price: "$100",
      period: "total",
      duration: "1 year",
      totalPrice: "$100",
      monthlyPrice: "$8.33",
      tokens: 360,
      tokensPerMonth: 30,
      savings: "$20",
      features: [
        "360 tokens total (30/month)",
        "1 generation per token",
        "3 revisions per generation",
        "Rollover unused tokens",
        "Priority support",
        "Save $20 vs monthly",
        "Best value",
      ],
      cta: "Subscribe Now",
      highlighted: false,
      icon: Zap,
    },
  ];

  const tokenPlans = [
    {
      name: "Starter Pack",
      type: "one-time",
      price: "$6",
      tokens: 4,
      pricePerToken: "$1.50",
      features: [
        "4 tokens",
        "1 generation per token",
        "3 revisions per generation",
        "No expiration",
      ],
      cta: "Buy Now",
      highlighted: false,
      icon: Coins,
    },
    {
      name: "Value Pack",
      type: "one-time",
      price: "$10",
      tokens: 10,
      pricePerToken: "$1.00",
      features: [
        "10 tokens",
        "1 generation per token",
        "3 revisions per generation",
        "No expiration",
        "Best value",
      ],
      cta: "Buy Now",
      highlighted: false,
      icon: Coins,
    },
  ];

  return (
    <div className="pt-12 px-6 pb-12">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-foreground">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Choose between monthly subscription or pay-as-you-go tokens
          </p>
        </div>

        {/* Subscription Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold mb-8 text-center text-foreground">Subscription Plans</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {subscriptionPlans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-[#FAF9F6] rounded-xl p-6 border ${
                  plan.highlighted
                    ? "border-primary shadow-xl ring-2 ring-primary/20"
                    : "border-border shadow-lg"
                }`}
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  {plan.highlighted && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                      Most Popular
                    </div>
                  )}
                  
                  {plan.savings && (
                    <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                      Save {plan.savings}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <plan.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-foreground">{plan.totalPrice}</span>
                    {plan.period === "per month" && (
                      <span className="text-muted-foreground text-sm">/ month</span>
                    )}
                  </div>
                  {plan.period === "total" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.monthlyPrice} per month
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.tokens} tokens ({plan.tokensPerMonth}/month)
                  </p>
                </div>

                <Button
                  className={`w-full mb-6 ${
                    plan.highlighted
                      ? "bg-primary hover:bg-primary/90 text-white"
                      : ""
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Token Packs Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-8 text-center text-foreground">One-Time Token Packs</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {tokenPlans.map((plan) => (
              <div
                key={plan.name}
                className={`bg-[#FAF9F6] rounded-xl p-8 border ${
                  plan.highlighted
                    ? "border-primary shadow-xl ring-2 ring-primary/20"
                    : "border-border shadow-lg"
                }`}
              >
                {plan.highlighted && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    Best Value
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    <plan.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{plan.name}</h3>
                </div>
                
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.tokens} tokens ({plan.pricePerToken} per token)
                  </p>
                </div>

                <Button
                  className={`w-full mb-8 ${
                    plan.highlighted
                      ? "bg-primary hover:bg-primary/90 text-white"
                      : ""
                  }`}
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-16 max-w-3xl mx-auto bg-muted/50 rounded-xl p-8 text-center">
          <h3 className="text-xl font-semibold mb-4 text-foreground">How Tokens Work</h3>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div>
              <h4 className="font-semibold mb-2 text-foreground">1 Token = 1 Generation</h4>
              <p className="text-sm text-muted-foreground">
                Each token allows you to generate one 3D keychain from your uploaded image.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-foreground">3 Revisions Included</h4>
              <p className="text-sm text-muted-foreground">
                Every generation includes 3 free revisions to adjust thickness, hole position, and more.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

