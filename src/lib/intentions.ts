export interface IntentionPreset {
  label: string;
  prompts: string[];
}

// Default rotation when no intention is set — Posture Patrol's house prompts.
export const DEFAULT_PROMPTS = [
  'Imagine a light canvas',
  'Place your thoughts on the canvas',
  'Let your mind empty',
  'Soften your gaze',
  'Lengthen through the crown',
  'Roll your shoulders back',
  'Breathe into the stillness',
  "Release what doesn't serve",
];

export const PRESET_INTENTIONS: IntentionPreset[] = [
  {
    label: 'Find calm',
    prompts: [
      'Find calm in your breath',
      'Your body is calm',
      'Calm flows through you',
      'Let calm settle in your shoulders',
      'Breathe calm into your chest',
      'Calm fills the space around you',
      'Soften into calm',
      'Each breath deepens your calm',
    ],
  },
  {
    label: 'Release tension',
    prompts: [
      'Release tension with each exhale',
      'Let tension dissolve from your jaw',
      'Soften wherever you hold tension',
      'Tension flows out as you breathe',
      'Notice tension · release it',
      'Your body lets go of what it doesn’t need',
      'Let your shoulders release',
      'Each breath releases more',
    ],
  },
  {
    label: 'Breathe deeply',
    prompts: [
      'Breathe deeply · slowly · fully',
      'Each breath is a gift to your body',
      'Feel your chest rise · feel it fall',
      'Breathe into your belly',
      'Deep breath in · longer breath out',
      'Your breath is your anchor',
      'Notice the breath at the tip of your nose',
      'Let each breath nourish you',
    ],
  },
  {
    label: 'Let go',
    prompts: [
      'Let go of what you carry',
      'Release · release · release',
      'Let go of the day',
      'Let your thoughts drift past',
      'Soften and let go',
      'Let your body settle',
      'Loosen your grip on the moment',
      'Let go of the next breath before it comes',
    ],
  },
  {
    label: 'Be present',
    prompts: [
      'Be here · in this breath',
      'Notice what is, right now',
      'Return to this moment',
      'Be present with your body',
      'Be here · be still · be',
      'This breath is enough',
      'Notice five sounds around you',
      'Land fully in this moment',
    ],
  },
];

// Used when the user typed a custom intention that isn't a preset.
export const CUSTOM_INTENTION_PROMPTS = [
  'Hold your intention',
  'Return to your intention',
  'Let your intention guide this breath',
  'Breathe with your intention in mind',
  'Stay with your intention',
  'Your intention rests in your chest',
  'Notice your intention quietly',
  'Allow space for your intention',
];

export function getPromptsForIntention(intention: string | null): string[] {
  if (!intention) return DEFAULT_PROMPTS;
  const preset = PRESET_INTENTIONS.find((p) => p.label === intention);
  if (preset) return preset.prompts;
  return CUSTOM_INTENTION_PROMPTS;
}
