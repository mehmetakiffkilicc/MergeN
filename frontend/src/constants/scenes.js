/**
 * Scene name constants to avoid hardcoding strings throughout the app.
 * Using constants prevents typos and makes refactoring easier.
 */
export const SCENE_NAMES = {
  HERO: 'hero',
  LOADING: 'loading',
  ANALYSIS: 'analysis',
  PERSONALIZATION: 'personalization',
  DASHBOARD: 'dashboard',
  CHAT: 'chat',
  COMPARISON: 'comparison',
  HISTORY: 'history',
};

export const SCENE_TRANSITIONS = {
  [SCENE_NAMES.HERO]: [SCENE_NAMES.ANALYSIS, SCENE_NAMES.HISTORY],
  [SCENE_NAMES.ANALYSIS]: [SCENE_NAMES.PERSONALIZATION],
  [SCENE_NAMES.PERSONALIZATION]: [SCENE_NAMES.DASHBOARD],
  [SCENE_NAMES.DASHBOARD]: [SCENE_NAMES.CHAT, SCENE_NAMES.COMPARISON, SCENE_NAMES.PERSONALIZATION],
  [SCENE_NAMES.CHAT]: [SCENE_NAMES.DASHBOARD],
  [SCENE_NAMES.COMPARISON]: [SCENE_NAMES.DASHBOARD],
  [SCENE_NAMES.HISTORY]: [SCENE_NAMES.HERO],
};
