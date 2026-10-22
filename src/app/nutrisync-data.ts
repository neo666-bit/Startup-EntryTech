import { ImageKind } from './nutrisync/models';

export const foodPhoto =
  'https://images.unsplash.com/photo-1762631383556-7fa1365898b7?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200';
export const saladPhoto =
  'https://images.unsplash.com/photo-1547592180-85f173990554?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=1200';
export const marinaPhoto =
  'https://images.unsplash.com/photo-1675270690434-aa99f4871e8a?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=800';
export const secondProfessional =
  'https://images.unsplash.com/photo-1585358682246-23acb1561f6b?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=85&w=500';

export const imageUrl = (kind: ImageKind): string => (kind === 'food' ? foodPhoto : saladPhoto);
