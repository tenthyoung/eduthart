import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
  variant?: "h1" | "h2" | "h3";
}

const getVariantClasses = (variant?: "h1" | "h2" | "h3") => {
  switch (variant) {
    case "h1":
      return "mb-3 text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl";
    case "h2":
      return "mb-6 text-3xl font-semibold leading-[1.1] tracking-[-0.035em] md:text-4xl";
    case "h3":
      return "mb-5 text-2xl font-semibold leading-[1.14] tracking-[-0.025em] md:text-3xl";
    default:
      return "mb-6 text-3xl font-semibold leading-[1.1] tracking-[-0.035em] md:text-4xl";
  }
};

export default function GradientText({
  children,
  className = "",
  colors = ["#b19eef", "#6b48e5", "#b19eef"],
  animationSpeed = 8,
  showBorder = false,
  variant = "h2",
}: GradientTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(to right, ${colors.join(", ")})`,
    animationDuration: `${animationSpeed}s`,
  };

  const variantClasses = getVariantClasses(variant);

  return (
    <div
      className={cn(
        "relative mx-auto flex max-w-fit cursor-pointer flex-row items-center justify-center overflow-hidden rounded-[1.25rem] font-medium backdrop-blur transition-shadow duration-500",
        variantClasses,
        className
      )}
    >
      {showBorder && (
        <div
          className="animate-gradient pointer-events-none absolute inset-0 z-0 bg-cover"
          style={{
            ...gradientStyle,
            backgroundSize: "300% 100%",
          }}
        >
          <div
            className="absolute inset-0 z-[-1] rounded-[1.25rem] bg-black"
            style={{
              width: "calc(100% - 2px)",
              height: "calc(100% - 2px)",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          ></div>
        </div>
      )}
      <div
        className="animate-gradient relative z-2 inline-block bg-cover text-transparent"
        style={{
          ...gradientStyle,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          backgroundSize: "300% 100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// tailwind.config.js
// module.exports = {
//   theme: {
//     extend: {
//       keyframes: {
//         gradient: {
//           '0%': { backgroundPosition: '0% 50%' },
//           '50%': { backgroundPosition: '100% 50%' },
//           '100%': { backgroundPosition: '0% 50%' },
//         },
//       },
//       animation: {
//         gradient: 'gradient 8s linear infinite'
//       },
//     },
//   },
//   plugins: [],
// };
