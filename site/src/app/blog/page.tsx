import { Heading } from "@/components/text/heading";
import { Button } from "@/components/ui/button";
import { client } from "@/sanity/client";
import { Calendar, ChevronRight, Clock, Search } from "lucide-react";
import { type SanityDocument } from "next-sanity";
import Link from "next/link";

const POSTS_QUERY = `*[
  _type == "post"
  && defined(slug.current)
]|order(publishedAt desc)[0...12]{_id, title, slug, publishedAt, excerpt}`;

const options = { next: { revalidate: 30 } };

export default async function BlogPage() {
  const posts = await client.fetch<SanityDocument[]>(POSTS_QUERY, {}, options);

  const categories = [
    "All Posts",
    "Exhibition Notes",
    "Artist Spotlights",
    "Collector Guides",
    "Studio Visits",
    "Gallery Journal",
  ];

  const featuredPost = posts[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-16 max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <Heading variant="h1">EduthArt Journal</Heading>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Exhibition essays, artist notes, and collecting perspectives from
            the gallery.
          </p>
        </div>

        {/* Search and Categories */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search the journal..."
                className="w-full pl-10 pr-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category, index) => (
                <Button
                  key={index}
                  variant={index === 0 ? "default" : "outline"}
                  size="sm"
                  className="rounded-full"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <div className="bg-card p-8 rounded-lg border mb-12 hover:shadow-lg transition-shadow">
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:flex-1">
                <div className="flex items-center mb-4">
                  <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                    Featured Post
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {featuredPost.title}
                </h2>
                <p className="text-muted-foreground text-lg mb-6">
                  {featuredPost.excerpt ||
                    "Read the latest essay from the gallery on artists, exhibitions, and the experience of living with art."}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(featuredPost.publishedAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />5 min read
                  </div>
                </div>
                <Button size="lg" asChild>
                  <Link href={`/${featuredPost.slug.current}`}>
                    Read the Full Essay
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
              <div className="lg:w-96 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg p-8 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">🖼️</div>
                  <div className="text-sm text-muted-foreground">
                    Featured Article
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {posts.slice(1).map((post) => (
            <article
              key={post._id}
              className="bg-card p-6 rounded-lg border hover:shadow-lg transition-shadow group"
            >
              <div className="mb-4">
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg h-32 flex items-center justify-center mb-4">
                  <div className="text-2xl">📚</div>
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                  <Link href={`/${post.slug.current}`}>{post.title}</Link>
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {post.excerpt ||
                    "Notes from the gallery on exhibitions, collecting, and the artists shaping the current program."}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(post.publishedAt).toLocaleDateString()}
                </div>
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />3 min read
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mb-16">
          <Button variant="outline" size="lg">
            Load More Articles
          </Button>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-card p-8 rounded-lg border text-center">
          <h2 className="text-2xl font-bold mb-4">
            Never Miss an EduthArt Update
          </h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Subscribe for exhibition essays, artist spotlights, and gallery
            announcements delivered straight to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button>Subscribe</Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </div>
  );
}
