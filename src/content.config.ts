import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const books = defineCollection({
  loader: file('src/content/books.json'),
  schema: z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be a valid slug'),
    title: z.string().min(1),
    author: z.string().min(1).nullable(),
    illustrator: z.string().min(1).nullable(),
    authorInfo: z.string().min(1).nullable(),
    authorConnection: z.array(z.string().min(1)),
    coverImage: z.string().url().nullable(),
    bookType: z.string().min(1).nullable(),
    ageRange: z.string().min(1).nullable(),
    ageGroups: z.array(z.string().min(1)),
    representationTypes: z.array(z.string().min(1)),
    equipment: z.array(z.string().min(1)),
    mainCharacter: z.boolean(),
    carnegieLibraryLink: z.string().url().nullable(),
    series: z.string().min(1).nullable(),
    seriesNumber: z.number().int().positive().nullable(),
    tags: z.array(z.string().min(1)),
    publicationYear: z.number().int().min(1800).max(2100).nullable(),
    purchaseLink: z.string().url().nullable(),
    landingPage: z.boolean(),
    summary: z.string().min(1).nullable(),
  }),
});

const metadata = defineCollection({
  loader: file('src/content/metadata.json'),
  schema: z.object({
    coverUrl: z.string().nullable(),
    isbn: z.string().nullable(),
    olid: z.string().nullable(),
    description: z.string().nullable(),
  }),
});

const reviews = defineCollection({
  loader: file('src/content/reviews.json'),
  schema: z.object({
    bookId: z.string(),
    reviewer: z.string(),
    stars: z.number().min(1).max(5),
    text: z.string(),
    photo: z.string().nullable(),
  }),
});

export const collections = { books, metadata, reviews };
