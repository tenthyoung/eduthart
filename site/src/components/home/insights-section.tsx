import { client } from "@/sanity/client";
import { type SanityDocument } from "next-sanity";
import Image from "next/image";
import Link from "next/link";
import { MotionStaggerFade } from "../motion/motion-stagger-fade";
import { Heading } from "../text/heading";
import { Button } from "../ui/button";

const INSIGHTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...3]{
  _id, 
  title, 
  slug, 
  publishedAt, 
  body,
  image{
    asset->{
      _id,
      url
    },
    alt
  }
}`;

export const InsightsSection = async () => {
  const posts = await client.fetch<SanityDocument[]>(
    INSIGHTS_QUERY,
    {},
    { next: { revalidate: 30 } },
  );

  return (
    <section className="py-16 lg:py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section Header */}
        <MotionStaggerFade className="text-center mb-16">
          <Heading variant="h2">
            Stay Ahead With{" "}
            <span className="text-primary">Expert Knowledge</span>
          </Heading>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            Explore study strategies, product updates, and practical ideas for
            improving memory, consistency, and learning design. The goal is to
            help you study smarter, not just harder.
          </p>
        </MotionStaggerFade>

        {posts.length > 0 ? (
          <div className="space-y-12">
            {/* Posts Grid */}
            <MotionStaggerFade className="grid md:grid-cols-2 lg:grid-cols-3 md:grid-rows-2 lg:grid-rows-1 gap-8">
              {posts.map((post) => (
                <article
                  key={post._id}
                  className="bg-card rounded-lg border hover:shadow-lg transition-shadow group overflow-hidden"
                >
                  <Link href={`/${post.slug.current}`}>
                    <div className="space-y-4">
                      {/* Image */}
                      {post.image?.asset?.url && (
                        <div className="relative w-full h-48 overflow-hidden">
                          <Image
                            src={post.image.asset.url}
                            alt={post.image.alt || post.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-6 space-y-4">
                        <h3 className="text-xl font-semibold group-hover:text-primary transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        {post.excerpt && (
                          <p className="text-muted-foreground line-clamp-3">
                            {post.excerpt}
                          </p>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </Link>
                </article>
              ))}
            </MotionStaggerFade>

            {/* View All Button */}
            <div className="text-center">
              <Button size="lg" asChild>
                <Link href="/blog">View All Insights</Link>
              </Button>
            </div>
          </div>
        ) : (
          /* No Posts Yet */
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold">Check back soon</h3>
              <p className="text-lg text-muted-foreground">
                Once posts are published, you&apos;ll see them here.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/blog">Visit Blog</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
