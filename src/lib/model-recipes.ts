/** Edit model metadata and available choices here. */
export interface ModelRecipe {
  label: string;
  family: 'llada' | 'diffusion-gemma' | 'nemotron-labs-diffusion';
  checkpoint: string;
  variants: Record<string, string>;
  variantLinks: Record<string, VariantLink>;
  parallelism: string[];
}

interface VariantLink {
  label: string;
  href: string;
}

export const models: Record<string, ModelRecipe> = {
  'LLaDA2.0-mini': {
    label: 'LLaDA2.0-Mini',
    family: 'llada',
    checkpoint: 'inclusionAI/LLaDA2.0-mini',
    variants: { BF16: 'BF16 33GB'},
    variantLinks: { BF16: 
      {
        label: 'inclusionAI/LLaDA2.0-mini',
        href: 'https://huggingface.co/inclusionAI/LLaDA2.0-mini',
      }, 
    },
    parallelism: ['1', '4'],
  },
  'LLaDA2.0-flash': {
    label: 'LLaDA2.0-Flash',
    family: 'llada',
    checkpoint: 'inclusionAI/LLaDA2.0-flash',
    variants: { BF16: 'BF16 206GB'},
    variantLinks: { BF16: 
      {
        label: 'inclusionAI/LLaDA2.0-flash',
        href: 'https://huggingface.co/inclusionAI/LLaDA2.0-flash',
      }, 
    },
    parallelism: ['4'],
  },
  'LLaDA2.1-mini': {
    label: 'LLaDA2.1-Mini',
    family: 'llada',
    checkpoint: 'inclusionAI/LLaDA2.1-mini',
    variants: { BF16: 'BF16 33 GB'},
    variantLinks: { BF16: 
      {
        label: 'inclusionAI/LLaDA2.1-mini',
        href: 'https://huggingface.co/inclusionAI/LLaDA2.1-mini',
      }, 
    },
    parallelism: ['1', '4'],
  },
  'LLaDA2.1-flash': {
    label: 'LLaDA2.1-Flash',
    family: 'llada',
    checkpoint: 'inclusionAI/LLaDA2.1-flash',
    variants: { BF16: 'BF16 206GB'},
    variantLinks: { BF16: 
      {
        label: 'inclusionAI/LLaDA2.1-flash',
        href: 'https://huggingface.co/inclusionAI/LLaDA2.1-flash',
      }, 
    },
    parallelism: ['4'],
  },
  'diffusion-gemma': {
    label: 'Diffusion-Gemma',
    family: 'diffusion-gemma',
    checkpoint: 'google/diffusiongemma-26B-A4B-it',
    variants: { BF16: 'BF16 52GB', FP8: 'FP8 27GB', NVFP4: 'NVFP4 19GB' },
    variantLinks: {
      BF16: {
        label: 'google/diffusiongemma-26B-A4B-it',
        href: 'https://huggingface.co/google/diffusiongemma-26B-A4B-it',
      },
      FP8: {
        label: 'RedHatAI/diffusiongemma-26B-A4B-it-FP8-dynamic',
        href: 'https://huggingface.co/RedHatAI/diffusiongemma-26B-A4B-it-FP8-dynamic',
      },
      NVFP4: {
        label: 'nvidia/diffusiongemma-26B-A4B-it-NVFP4',
        href: 'https://huggingface.co/nvidia/diffusiongemma-26B-A4B-it-NVFP4',
      },
    },
    parallelism: ['1', '4'],
  },
  ...Object.fromEntries(['3B', '8B', '14B'].map(size => {
    const checkpoint = `nvidia/Nemotron-Labs-Diffusion-${size}`;
    return [`nemotron-${size.toLowerCase()}`, {
      label: `Nemotron-Labs-Diffusion-${size}`,
      family: 'nemotron-labs-diffusion' as const,
      checkpoint,
      variants: { BF16: 'BF16' },
      variantLinks: { BF16: { label: checkpoint, href: `https://huggingface.co/${checkpoint}` } },
      parallelism: ['1'],
    }];
  })),
};

export interface Selection {
  model: string;
  hardware: string;
  variant: string;
  backend: string;
  parallel: string;
  decoding: string;
}
export type Setting = keyof Selection;
interface Option {
  value: string;
  label: string;
  verified?: boolean;
}
interface Group {
  key: Setting;
  label: string;
  options: Option[];
}

/** Array order controls the order of selector sections. */
export const groups: Group[] = [
  {
    key: 'model',
    label: 'Model',
    options: Object.entries(models).map(([value, model]) => ({ value, label: model.label })),
  },
  {
    key: 'hardware',
    label: 'Hardware',
    options: [
      { value: 'H100', label: 'H100', verified: true },
      { value: 'H200', label: 'H200', verified: true },
      { value: 'GH200', label: 'GH200', verified: true },
      { value: 'B200', label: 'B200', verified: true },
      { value: 'RTX Pro 6000', label: 'RTX Pro 6000' },
    ],
  },
  {
    key: 'variant',
    label: 'Variant',
    options: ['BF16', 'FP8', 'NVFP4'].map(value => ({ value, label: value })),
  },
  {
    key: 'backend',
    label: 'Attention Backend',
    options: [
      { value: 'flashinfer', label: 'FlashInfer' },
      { value: 'fa4', label: 'FA4' },
    ],
  },
  {
    key: 'parallel',
    label: 'Parallelism Settings',
    options: ['1', '4'].map(value => ({ value, label: `TP=EP=${value}` })),
  },
  {
    key: 'decoding',
    label: 'Decoding Method',
    options: [
      { value: 'threshold', label: 'Threshold' },
      { value: 'self_speculation', label: 'Self speculation' },
    ],
  },
];

export const defaults: Selection = {
  model: 'LLaDA2.0-mini',
  hardware: 'H100',
  variant: 'BF16',
  backend: 'flashinfer',
  parallel: '1',
  decoding: 'threshold',
};

export function selectOption(current: Selection, key: Setting, value: string): Selection {
  if (!optionEnabled(current, key, value)) return current;
  const next = { ...current, [key]: value };
  const model = models[next.model];
  if (!(next.variant in model.variants) || !optionEnabled(next, 'variant', next.variant)) next.variant = 'BF16';
  if (!optionEnabled(next, 'backend', next.backend)) next.backend = 'flashinfer';
  if (key === 'model' || !model.parallelism.includes(next.parallel)) next.parallel = model.parallelism[0];
  if (model.family === 'nemotron-labs-diffusion' && next.decoding === 'self_speculation') next.backend = 'fa4';
  if (model.family !== 'nemotron-labs-diffusion') next.decoding = 'threshold';
  return next;
}

export function optionVisible(selection: Selection, key: Setting, value: string): boolean {
  const model = models[selection.model];
  if (key === 'variant') return value in model.variants;
  if (key === 'parallel') return model.parallelism.includes(value);
  return true;
}

export function optionEnabled(selection: Selection, key: Setting, value: string): boolean {
  if (key === 'variant') return value === 'BF16';
  if (key === 'backend' && value === 'fa4') return selection.model !== 'diffusion-gemma';
  if (key === 'backend' && value === 'flashinfer' && selection.decoding === 'self_speculation') return false;
  return true;
}

export function optionLabel(selection: Selection, key: Setting, option: Option): string {
  return key === 'variant' ? models[selection.model].variants[option.value] ?? option.label : option.label;
}

/** Keep command arguments explicit: no replacements against rendered HTML. */
export function buildCommand(selection: Selection): string {
  if (models[selection.model].family === 'nemotron-labs-diffusion') {
    const selfSpeculation = selection.decoding === 'self_speculation';
    const args = [
      `--model ${models[selection.model].checkpoint}`,
      '--tp-size 1',
      ...(selfSpeculation ? ['--max-scheduled-tokens 2048'] : []),
      '--block-length 32',
      '--page-size 32',
      `--parallel-decoding ${selection.decoding}`,
      ...(selfSpeculation ? ['--max-thinking-tokens 1024'] : ['--threshold 0.9']),
      `--attention-backend ${selection.backend}`,
      '--trust-remote-code',
    ];
    return ['fluxserve launch', ...args.map(arg => '  ' + arg)].join(' \\\n');
  }
  const isLlada21 = selection.model.startsWith('LLaDA2.1-');
  const isGemma = selection.model === 'diffusion-gemma';
  const args: [string, string][] = [
    ['model', models[selection.model].checkpoint],
    ['tp-size', selection.parallel],
    ['dp-size', '1'],
    ['ep-size', selection.parallel],
    ...(isLlada21 ? [
      ['parallel-decoding', 'joint_threshold'],
      ['threshold', '0.7'],
      ['editing-threshold', '0.5'],
      ['max-post-steps', '16'],
    ] as [string, string][] : []),
    ...(isGemma ? [
      ['max-num-seqs', '4'],
      ['max-model-len', '8192'],
      ['block-length', '256'],
      ['canvas-length', '256'],
      ['page-size', '256'],
    ] as [string, string][] : []),
    ['attention-backend', selection.backend],
    ...(isGemma ? [['scheduler-policy', 'default']] as [string, string][] : []),
  ];
  return ['fluxserve launch', ...args.map(([key, value]) => `  --${key} ${value}`)].join(' \\\n');
}

/** Derive display state in one place for both initial HTML and browser updates. */
export function recipeView(selection: Selection) {
  const reasons: string[] = [];
  if (selection.variant !== 'BF16') {
    reasons.push(`${selection.variant} quantized checkpoints are not supported by the current FluxServe CLI.`);
  }
  if (selection.backend === 'fa4' && selection.model === 'diffusion-gemma')
    reasons.push('FA4 serving is not available for this model recipe.');
  if (selection.decoding === 'self_speculation' && selection.backend !== 'fa4')
    reasons.push('Nemotron self speculation requires FA4.');
  const unsupported = reasons.length > 0;
  const gemmaBF16 = selection.model === 'diffusion-gemma' && selection.variant === 'BF16';
  const variantLink = models[selection.model].variantLinks[selection.variant];
  const hardwareOptions = groups.find(group => group.key === 'hardware')!.options;
  const verified = !unsupported && (models[selection.model].family === 'nemotron-labs-diffusion'
    ? selection.hardware === 'GH200'
    : hardwareOptions.some(
    option => option.value === selection.hardware && option.verified,
  ));
  const note = unsupported
    ? 'Choose a supported BF16 variant and attention backend for a runnable command.'
    : models[selection.model].family === 'nemotron-labs-diffusion'
      ? 'FluxServe has measured these recipes on a single GH200. Other hardware targets may require tuning.'
    : selection.model === 'diffusion-gemma'
      ? 'This recipe uses --scheduler-policy default as requested; it requires a FluxServe version accepting that policy (the local CLI currently lists paged and dynamic).'
      : 'Hardware selects the target label; FluxServe detects the installed GPU. Adjust the checkpoint in the command as needed.';
  return {
    command: unsupported ? reasons.map(reason => '# ' + reason).join('\n') : buildCommand(selection),
    unsupported,
    gemmaBF16,
    variantLink,
    verified,
    note,
    verificationLabel: 'Verified on NVIDIA ' + selection.hardware,
  };
}
