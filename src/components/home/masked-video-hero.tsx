"use client";

import MuxPlayer from "@mux/mux-player-react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef } from "react";

gsap.registerPlugin(ScrollTrigger);

interface MaskedVideoHeroProps {
  muxPlaybackId: string;
  logoText?: string;
}

export function MaskedVideoHero({ muxPlaybackId }: MaskedVideoHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!logoRef.current || !sectionRef.current || !videoContainerRef.current)
      return;

    // Initial animation on page load
    gsap.fromTo(
      logoRef.current,
      {
        fontSize: "15vw",
        opacity: 1,
      },
      {
        fontSize: "8vw",
        duration: 1.5,
        delay: 0.3,
      },
    );

    // * Scroll-triggered animation - grow the text and reveal video, and zoom the video
    gsap.to(logoRef.current, {
      fontSize: "25vw",
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom center",
        scrub: 1.2,
        markers: false,
      },
    });

    // * Zoom the video container on scroll
    gsap.to(videoContainerRef.current, {
      scale: 10,
      scrollTrigger: {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom center",
        scrub: 1.2,
        markers: false,
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: "smooth",
    });
  };

  return (
    <div
      ref={sectionRef}
      className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#241a12] via-[#1b140f] to-[#120d09]"
    >
      {/* Video Container with SVG Mask */}
      <div
        ref={videoContainerRef}
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: "url(/logo/hendeca-logo-white.svg)",
          mask: "url(/logo/pure-logo-mask.svg)",
          maskSize: "contain",
          maskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
        }}
      >
        <MuxPlayer
          playbackId={muxPlaybackId}
          autoPlay
          muted
          loop
          thumbnailTime={1}
          style={
            {
              "--media-object-fit": "cover",
              "--media-object-position": "center",
              width: "100%",
              height: "100%",
              "--controls": "none",
            } as React.CSSProperties
          }
          nohotkeys
        />
      </div>

      {/* Logo SVG Overlay with White Stroke */}
      <div
        ref={logoRef}
        style={{
          position: "relative",
          zIndex: 20,
          fontSize: "8vw",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          color: "white",
          WebkitTextStroke: "1.5px white",
          textShadow: "0 4px 20px rgba(0, 0, 0, 0.6)",
          whiteSpace: "nowrap",
        }}
      >
        {/* <Image
          src="/logo/pure-logo-mask.svg"
          alt="PURE"
          width={336}
          height={192}
          style={{
            width: "100%",
            height: "auto",
            filter: "drop-shadow(0 4px 20px rgba(0, 0, 0, 0.6))",
          }}
        /> */}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
        <button
          onClick={scrollToContent}
          className="animate-bounce text-[#efe4d6] transition-colors duration-200 hover:text-primary-light"
          aria-label="Scroll to content"
        >
          <ChevronDown size={32} />
        </button>
      </div>
    </div>
  );
}
