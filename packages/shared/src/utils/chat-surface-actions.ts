export type ChannelSurfaceActionId =
  | 'search'
  | 'pins'
  | 'source_dm'
  | 'polls'
  | 'edit_channel'
  | 'community_settings';

interface ResolveChannelSurfaceActionOrderInput {
  showSearch?: boolean;
  showPins?: boolean;
  showSourceDm?: boolean;
  showPolls?: boolean;
  showEditChannel?: boolean;
  showCommunitySettings?: boolean;
}

const PRIMARY_ACTION_ORDER: ChannelSurfaceActionId[] = ['search', 'pins'];
const OVERFLOW_ACTION_ORDER: ChannelSurfaceActionId[] = [
  'source_dm',
  'polls',
  'edit_channel',
  'community_settings',
];

export function resolveChannelSurfaceActionOrder(
  input: ResolveChannelSurfaceActionOrderInput,
): {
  primary: ChannelSurfaceActionId[];
  overflow: ChannelSurfaceActionId[];
} {
  const enabledActions = new Set<ChannelSurfaceActionId>();

  if (input.showSearch) enabledActions.add('search');
  if (input.showPins) enabledActions.add('pins');
  if (input.showSourceDm) enabledActions.add('source_dm');
  if (input.showPolls) enabledActions.add('polls');
  if (input.showEditChannel) enabledActions.add('edit_channel');
  if (input.showCommunitySettings) enabledActions.add('community_settings');

  return {
    primary: PRIMARY_ACTION_ORDER.filter((action) => enabledActions.has(action)),
    overflow: OVERFLOW_ACTION_ORDER.filter((action) => enabledActions.has(action)),
  };
}
