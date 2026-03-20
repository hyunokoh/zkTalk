import { SearchMessagesSchema, CursorPaginationSchema } from '@zktalk/shared';

export { SearchMessagesSchema, CursorPaginationSchema };

export const SearchQuerySchema = SearchMessagesSchema.merge(CursorPaginationSchema);
