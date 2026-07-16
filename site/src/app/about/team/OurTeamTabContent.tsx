import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useTailwindBreakpoint } from "@/hooks";
import { X } from "lucide-react";
import Image from "next/image";
import { teamMembers } from "./aboutTeam.constants";

export const OurTeamTabContent = () => {
  const { isDesktop } = useTailwindBreakpoint();

  return (
    <div>
      <Heading variant="h2">
        Meet the <span className="text-primary">Team</span>
      </Heading>
      <div className="flex justify-center">
        <MotionStaggerFade
          initialDelay={0.1}
          className="grid md:grid-cols-2 gap-8"
        >
          {teamMembers.map((member, index) => {
            return (
              <div
                key={index}
                className="bg-card border border-border/50 rounded-2xl overflow-hidden"
              >
                {/* Image - Responsive Layout */}
                <div className="flex justify-center py-6">
                  <div className="relative w-72 h-72 rounded-full overflow-hidden border-4 border-primary/20">
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      className="object-cover"
                      style={{
                        objectPosition:
                          member.mobileAvatarPosition || "50% 20%",
                      }}
                    />
                  </div>
                </div>

                {/* Content */}
                <div className="relative p-6 flex flex-col flex-grow">
                  {/* Name and title */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-foreground">
                        {member.name}
                      </h3>
                      <div className="w-6 h-0.5 bg-gradient-to-r from-primary to-transparent opacity-60" />
                    </div>
                    <p className="text-primary font-medium text-sm mb-3 bg-primary/10 px-3 py-1 rounded-lg inline-block">
                      {member.title}
                    </p>
                  </div>

                  {/* Description */}
                  <div className="flex-grow mb-4">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {member.shortDescription}
                    </p>
                  </div>

                  {/* Read more button - Sheet trigger */}
                  <div className="mt-auto pt-4 border-t border-border/30">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full text-primary hover:text-primary/80 transition-all duration-300 font-medium text-sm"
                        >
                          Learn More
                        </Button>
                      </SheetTrigger>
                      <SheetContent className="w-full sm:w-[600px] overflow-y-auto">
                        <SheetHeader className="sticky top-0 bg-background z-10 pb-4 border-b border-border/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <SheetTitle className="text-2xl font-bold text-foreground">
                                {member.name}
                              </SheetTitle>
                              <SheetDescription className="text-primary font-medium">
                                {member.title}
                              </SheetDescription>
                            </div>
                            <SheetClose asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <X size={20} />
                              </Button>
                            </SheetClose>
                          </div>
                        </SheetHeader>
                        <div className="mt-6 space-y-4 px-6 pb-6">
                          <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed">
                            {member.fullDescription
                              .split("\n\n")
                              .map((paragraph, idx) => (
                                <p key={idx} className="mb-4">
                                  {paragraph}
                                </p>
                              ))}
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                  </div>
                </div>
              </div>
            );
          })}
        </MotionStaggerFade>
      </div>
    </div>
  );
};
