import { MotionFade } from "@/components/motion/motion-fade";
import { MotionStaggerFade } from "@/components/motion/motion-stagger-fade";
import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import { client } from "@/sanity/client";
import { Calendar, ChevronRight, FileText } from "lucide-react";
import type { SanityDocument } from "next-sanity";
import Image from "next/image";
import Link from "next/link";

const FEATURED_POST_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0]{
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

const ALL_POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[1..10]{
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

export default async function InsightsPage() {
  // Fetch the latest post for featured content
  const featuredPost = await client.fetch<SanityDocument>(
    FEATURED_POST_QUERY,
    {},
    { next: { revalidate: 30 } },
  );

  // Fetch all other posts
  const allPosts = await client.fetch<SanityDocument[]>(
    ALL_POSTS_QUERY,
    {},
    { next: { revalidate: 30 } },
  );

  // const categories = [
  //   "All Insights",
  //   "Case Studies",
  //   "Reports",
  //   "Whitepapers",
  //   "Videos",
  //   "Best Practices",
  // ];

  return (
    <div className="min-h-screen bg-background text-foreground pt-24">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero Section */}
        <MotionStaggerFade>
          <div className="text-center mb-16">
            <Heading variant="h1">
              <span className="text-primary">Insights</span> from the Gallery
            </Heading>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Exhibition commentary, collecting perspectives, and essays that
              deepen the conversation around the work on view.
            </p>
          </div>

          {/* Categories Filter */}
          {/* <div className="flex flex-wrap justify-center gap-4 mb-12">
            {categories.map((category, index) => (
              <Button
                key={index}
                variant={index === 0 ? "default" : "outline"}
                size="sm"
                className="rounded-full mb-4 mr-2"
              >
                {category}
              </Button>
            ))}
          </div> */}

          {/* Featured Insight */}
          {featuredPost ? (
            <div className="bg-card p-8 rounded-lg border mb-12 hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:flex-1">
                  <div className="flex items-center mb-4">
                    <div className="bg-primary/10 p-2 rounded-lg mr-3">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">
                      Featured Article
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    {featuredPost.title}
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6">
                    Read the latest from EduthArt on exhibitions, artists, and
                    the experience of collecting with intention.
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {new Date(featuredPost.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button size="lg" asChild>
                    <Link href={`/${featuredPost.slug.current}`}>
                      Read Full Article
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
                <div className="lg:w-96">
                  {featuredPost.image?.asset?.url ? (
                    <div className="relative h-64 lg:h-full rounded-lg overflow-hidden">
                      <Image
                        src={featuredPost.image.asset.url}
                        alt={featuredPost.image.alt || featuredPost.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-8 h-64 lg:h-full flex items-center justify-center">
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
                        <div className="text-sm text-muted-foreground">
                          Featured Content
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card p-8 rounded-lg border mb-12 hover:shadow-lg transition-shadow">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:flex-1">
                  <div className="flex items-center mb-4">
                    <div className="bg-primary/10 p-2 rounded-lg mr-3">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-primary">
                      Featured Article
                    </span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">
                    No Featured Content Available
                  </h2>
                  <p className="text-muted-foreground text-lg mb-6">
                    Check back soon for our latest writing from the gallery.
                  </p>
                </div>
                <div className="lg:w-96 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-8 flex items-center justify-center">
                  <div className="text-center">
                    <FileText className="h-16 w-16 text-primary mx-auto mb-4" />
                    <div className="text-sm text-muted-foreground">
                      No Content Available
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </MotionStaggerFade>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {allPosts.length > 0 ? (
            allPosts.map((post, index) => (
              <MotionFade key={post._id} delay={0.1 * index}>
                <Link href={`/${post.slug.current}`}>
                  <div className="bg-card p-6 rounded-lg border hover:shadow-lg transition-shadow group cursor-pointer h-full">
                    {post.image?.asset?.url && (
                      <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                        <Image
                          src={post.image.asset.url}
                          alt={post.image.alt || post.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex items-center mb-3">
                      <div className="bg-primary/10 p-2 rounded-lg mr-3">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-primary">
                        Article
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold mb-3 group-hover:text-primary transition-colors">
                      {post.title}
                    </h3>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </div>
                  </div>
                </Link>
              </MotionFade>
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No journal entries available yet.
              </p>
            </div>
          )}
        </div>

        {/* Newsletter Signup */}
        <div className="bg-card p-8 rounded-lg border text-center">
          <h2 className="text-2xl font-bold mb-4">
            Stay Updated with EduthArt Insights
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Subscribe to receive new exhibition writing, artist notes, and
            gallery announcements directly in your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button>Subscribe</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
