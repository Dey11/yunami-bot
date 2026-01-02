import { z } from 'zod';

export const storyChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  emoji: z.string().optional(),
  style: z
    .union([
      z.enum(['Primary', 'Secondary', 'Success', 'Danger']),
      z.number().int(),
    ])
    .optional(),
  nextNodeId: z.string().min(1),
});

export const storyCheckpointSchema = z.object({
  cardId: z.string().min(1),
  cardName: z.string().min(1).optional(),
});

export const storyNodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  imageUrl: z.string().url().optional(),
  ending: z.boolean().optional(),
  checkpoint: storyCheckpointSchema.optional(),
  choices: z.array(storyChoiceSchema),
});

export const storyEpisodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  entryNodeId: z.string().min(1),
  nodes: z.record(storyNodeSchema),
  sharedScenes: z.record(storyNodeSchema).optional(),
});

export const storyCollectionSchema = z.object({
  episodes: z.array(storyEpisodeSchema),
});
export type StoryChoice = z.infer<typeof storyChoiceSchema>;
export type StoryCheckpoint = z.infer<typeof storyCheckpointSchema>;
export type StoryNode = z.infer<typeof storyNodeSchema>;
export type StoryEpisode = z.infer<typeof storyEpisodeSchema>;
export type StoryCollection = z.infer<typeof storyCollectionSchema>;
