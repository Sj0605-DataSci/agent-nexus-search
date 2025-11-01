import React from "react";

const StarIcon = ({ filled = true }: { filled?: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={`h-4 w-4 ${filled ? "text-yellow-400" : "text-gray-300"}`}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

const testimonials = [
  {
    name: "Rajesh Kumar",
    rating: 5,
    review:
      "Tara has transformed our accounting workflow. What used to take hours now takes minutes. The WhatsApp integration is a game-changer for our team.",
  },
  {
    name: "Priya Sharma",
    rating: 4,
    review:
      "The invoice scanning feature is incredibly accurate. We process hundreds of invoices monthly, and Tara handles them flawlessly with minimal errors.",
  },
  {
    name: "Amit Patel",
    rating: 5,
    review:
      "Real-time analytics have given us insights we never had before. The dashboard is intuitive and helps us make better financial decisions.",
  },
  {
    name: "Sneha Gupta",
    rating: 5,
    review:
      "Customer support is exceptional. The team responds quickly and helps resolve any queries. Highly recommend Tara for any business using Tally.",
  },
  {
    name: "Vikram Singh",
    rating: 4,
    review:
      "The automation features have reduced our manual work by 80%. Our accounting team can now focus on analysis rather than data entry.",
  },
  {
    name: "Meera Joshi",
    rating: 5,
    review:
      "Integration with our existing Tally setup was seamless. The AI understands our business context and provides accurate suggestions.",
  },
];

const TestimonialCard = ({ testimonial }: { testimonial: (typeof testimonials)[0] }) => (
    <div className="flex-shrink-0 w-96 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mx-4">
    <div className="flex items-center gap-1 mb-3">
      {[...Array(5)].map((_, i) => (
        <StarIcon key={i} filled={i < testimonial.rating} />
      ))}
      <span className="ml-2 text-xs font-medium text-gray-600">{testimonial.rating}.0</span>
    </div>

    <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-3">{testimonial.review}</p>

    <div className="flex items-center">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
        <span className="text-xs font-semibold text-blue-600">
          {testimonial.name
            .split(" ")
            .map(n => n[0])
            .join("")}
        </span>
      </div>
      <div className="ml-3">
        <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
      </div>
    </div>
  </div>
);

const Testimonials = () => {
  return (
    <section id="testimonials" className="bg-white overflow-hidden">
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
                        transform: translateX(calc(-416px * ${testimonials.length}));
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-bold sm:text-5xl">What They Say about us</h2>
          <p className="mt-4 text-4xl font-bold">
            has <span className="text-blue-400">never been easier</span>
          </p>
        </div>

        <div className="mt-16 relative mx-auto max-w-6xl overflow-hidden">
          <div className="flex animate-scroll justify-center">
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={`first-${index}`} testimonial={testimonial} />
            ))}
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={`second-${index}`} testimonial={testimonial} />
            ))}
            {testimonials.map((testimonial, index) => (
              <TestimonialCard key={`third-${index}`} testimonial={testimonial} />
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            Join thousands of businesses already using Tara to streamline their accounting
          </p>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
