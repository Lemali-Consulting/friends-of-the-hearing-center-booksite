import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const books = defineCollection({
  loader: file('src/content/books.json'),
  schema: z.object({
    id: z.string(),
    title: z.string(),
    author: z.string().nullable(),
    illustrator: z.string().nullable(),
    authorInfo: z.string().nullable(),
    authorConnection: z.array(z.string()),
    coverImage: z.string().nullable(),
    bookType: z.string().nullable(),
    ageRange: z.string().nullable(),
    ageGroups: z.array(z.string()),
    representationTypes: z.array(z.string()),
    equipment: z.array(z.string()),
    mainCharacter: z.boolean(),
    libraryAvailable: z.boolean().nullable(),
    publicationYear: z.number().nullable(),
    purchaseLink: z.string().nullable(),
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
