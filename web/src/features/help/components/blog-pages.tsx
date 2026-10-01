/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link } from '@tanstack/react-router'
import { CalendarDays, Newspaper, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

import {
  BLOG_CATEGORIES,
  type BlogPost,
  blogCategoryLabel,
  blogCategorySlug,
  blogCoverUrl,
} from '../lib/content'
import {
  useBlogPost,
  useBlogPosts,
  useBlogPostsByCategory,
} from '../hooks/use-content'
import { useContentVars } from '../lib/content-vars'
import { ArticleContent } from './article-content'
import { HelpBreadcrumbs, HelpContainer } from './help-container'

export function BlogListPage(props: { category?: string }) {
  const { t } = useTranslation()
  const allPosts = useBlogPosts()
  const activeCategory = props.category
    ? BLOG_CATEGORIES.find((item) => item.slug === props.category)
    : undefined
  const categoryPosts = useBlogPostsByCategory(activeCategory?.slug ?? '')
  const posts = activeCategory ? categoryPosts : allPosts

  return (
    <HelpContainer>
      <header className='mb-8'>
        <div className='flex items-center gap-2.5'>
          <Newspaper className='size-6' aria-hidden='true' />
          <h1 className='text-2xl font-bold tracking-tight'>
            {activeCategory ? t(activeCategory.label) : t('Blog')}
          </h1>
        </div>
        <p className='text-muted-foreground mt-2'>
          {activeCategory
            ? activeCategory.description
            : t('Latest articles, opinions and product news')}
        </p>
      </header>

      {!activeCategory && <BlogHighlight />}

      <div className='mt-8 flex flex-wrap items-center gap-2'>
        <CategoryPill to='/blog' label={t('All')} active={!activeCategory} />
        {BLOG_CATEGORIES.map((category) => (
          <CategoryPill
            key={category.slug}
            to='/blog/category/$category'
            params={{ category: category.slug }}
            label={t(category.label)}
            active={activeCategory?.slug === category.slug}
          />
        ))}
      </div>

      {posts.length === 0 ? (
        <div className='mt-6'>
          <EmptyState bordered icon={Newspaper} title={t('No Data')} />
        </div>
      ) : (
        <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {posts.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </HelpContainer>
  )
}

function CategoryPill(props: {
  to: string
  label: string
  active: boolean
  params?: Record<string, string>
}) {
  return (
    <Link
      to={props.to}
      params={props.params}
      className={cn(
        'inline-flex h-8 items-center rounded-full border px-3.5 text-sm transition-colors',
        props.active
          ? 'bg-primary text-primary-foreground border-transparent'
          : 'hover:bg-muted border-border/60'
      )}
    >
      {props.label}
    </Link>
  )
}

function BlogHighlight() {
  const { t } = useTranslation()
  const posts = useBlogPosts()
  const featured = posts.slice(0, 2)
  const recommended = posts.slice(0, 4)
  const [api, setApi] = useState<CarouselApi>()
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    if (!api) return
    const handleSelect = () => setActiveSlide(api.selectedScrollSnap())
    handleSelect()
    api.on('select', handleSelect)
    return () => {
      api.off('select', handleSelect)
    }
  }, [api])

  useEffect(() => {
    if (!api) return
    const timer = window.setInterval(() => api.scrollNext(), 5000)
    return () => window.clearInterval(timer)
  }, [api])

  return (
    <div className='grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]'>
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        className='relative overflow-hidden rounded-xl'
      >
        <CarouselContent className='ml-0'>
          {featured.map((post) => (
            <CarouselItem key={post.slug} className='pl-0'>
              <Link
                to='/blog/$slug'
                params={{ slug: post.slug }}
                className='group relative block'
              >
                <div className='bg-muted aspect-video w-full overflow-hidden'>
                  <img
                    src={blogCoverUrl(post.cover, 1280)}
                    alt={post.title}
                    loading='lazy'
                    referrerPolicy='no-referrer'
                    className='size-full object-cover transition-transform duration-500 group-hover:scale-105'
                  />
                </div>
                <div className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/30 to-transparent p-5 pt-16 text-white sm:p-8 sm:pt-24'>
                  <div className='mb-2 flex items-center gap-2 text-xs'>
                    <Badge className='border-transparent bg-white/20 text-white backdrop-blur-sm'>
                      {t(blogCategoryLabel(post.category))}
                    </Badge>
                    <span className='text-white/80'>{post.time}</span>
                  </div>
                  <h2 className='line-clamp-2 text-xl leading-tight font-bold sm:text-2xl md:text-3xl'>
                    {post.title}
                  </h2>
                  <p className='mt-2 line-clamp-2 max-w-2xl text-sm text-white/80'>
                    {post.description}
                  </p>
                </div>
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='absolute top-1/2 left-3 border-none bg-white/30 text-white hover:bg-white/50' />
        <CarouselNext className='absolute right-3 border-none bg-white/30 text-white hover:bg-white/50' />
        <div className='absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5'>
          {featured.map((post, index) => (
            <button
              key={post.slug}
              type='button'
              aria-label={t('Go to slide {{number}}', { number: index + 1 })}
              aria-current={index === activeSlide}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                index === activeSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'
              )}
            />
          ))}
        </div>
      </Carousel>

      <aside className='flex flex-col'>
        <div className='mb-3 flex items-center gap-1.5 text-sm font-semibold'>
          <span className='text-red-400'>{t('Featured')}</span>
          <span className='text-muted-foreground font-normal'>/</span>
          <span className='text-primary'>{t('Recommended')}</span>
        </div>
        <ul className='divide-border/50 flex-1 divide-y'>
          {recommended.map((post, index) => (
            <li key={post.slug} className='py-3.5 first:pt-0'>
              <Link
                to='/blog/$slug'
                params={{ slug: post.slug }}
                className='group flex gap-3'
              >
                <div className='bg-muted relative aspect-5/3 w-20 shrink-0 overflow-hidden rounded-md'>
                  <img
                    src={blogCoverUrl(post.cover, 160)}
                    alt={post.title}
                    loading='lazy'
                    referrerPolicy='no-referrer'
                    className='size-full object-cover transition-transform duration-300 group-hover:scale-105'
                  />
                  <span className='bg-primary/90 text-primary-foreground absolute top-0 left-0 rounded-br-md px-1.5 py-0.5 text-[11px] leading-none font-bold tabular-nums'>
                    {index + 1}
                  </span>
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='group-hover:text-primary line-clamp-2 text-sm leading-snug font-medium'>
                    {post.title}
                  </h3>
                  <span className='text-muted-foreground mt-1 block text-xs'>
                    {post.time}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

function BlogCard(props: { post: BlogPost }) {
  const { t } = useTranslation()

  return (
    <Link
      to='/blog/$slug'
      params={{ slug: props.post.slug }}
      className='group border-border/50 hover:border-primary/40 flex flex-col overflow-hidden rounded-xl border transition-all hover:shadow-md'
    >
      <div className='bg-muted aspect-video overflow-hidden'>
        <img
          src={blogCoverUrl(props.post.cover, 768)}
          alt={props.post.title}
          loading='lazy'
          referrerPolicy='no-referrer'
          className='size-full object-cover transition-transform duration-300 group-hover:scale-105'
        />
      </div>
      <div className='flex flex-1 flex-col gap-2 p-4'>
        <div className='text-muted-foreground flex items-center gap-2 text-xs'>
          <Badge variant='secondary' className='font-normal'>
            {t(blogCategoryLabel(props.post.category))}
          </Badge>
          <span>{props.post.time}</span>
        </div>
        <h3 className='group-hover:text-primary line-clamp-2 leading-snug font-semibold'>
          {props.post.title}
        </h3>
        <p className='text-muted-foreground line-clamp-2 text-sm'>
          {props.post.description}
        </p>
      </div>
    </Link>
  )
}

export function BlogPostPage(props: { slug: string }) {
  const { t } = useTranslation()
  const vars = useContentVars()
  const post = useBlogPost(props.slug)

  if (!post) {
    return (
      <HelpContainer>
        <EmptyState
          bordered
          icon={Newspaper}
          title={t('No Data')}
          description={t('Article not found')}
        />
      </HelpContainer>
    )
  }

  const categorySlug = blogCategorySlug(post.category)

  return (
    <HelpContainer>
      <div className='flex justify-center'>
        <article className='w-full max-w-3xl min-w-0'>
          <HelpBreadcrumbs
            items={[
              { label: t('Blog'), to: '/blog' },
              categorySlug
                ? {
                    label: t(blogCategoryLabel(post.category)),
                    to: '/blog/category/$category',
                    params: { category: categorySlug },
                  }
                : { label: post.category },
            ]}
          />
          <header className='space-y-4'>
            <h1 className='text-3xl leading-tight font-bold md:text-4xl'>
              {post.title}
            </h1>
            <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm'>
              <span className='inline-flex items-center gap-1'>
                <UserRound className='size-3.5' aria-hidden='true' />
                {vars.siteName}
              </span>
              <span className='inline-flex items-center gap-1'>
                <CalendarDays className='size-3.5' aria-hidden='true' />
                <span>{post.time}</span>
              </span>
            </div>
          </header>
          <div className='mt-8'>
            <ArticleContent html={post.html} />
          </div>
        </article>
      </div>
    </HelpContainer>
  )
}
