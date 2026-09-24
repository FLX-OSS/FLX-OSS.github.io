import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Transpile the pure helper without needing Astro or a browser.
const source = await readFile(new URL('../src/lib/model-recipes.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const { defaults, groups, models, selectOption, optionVisible, optionEnabled, optionLabel, recipeView } =
  await import('data:text/javascript;base64,' + Buffer.from(outputText).toString('base64'));

test('section order and default command are preserved', () => {
  assert.deepEqual(groups.map(group => group.key), ['model', 'hardware', 'variant', 'backend', 'parallel']);
  const lines = recipeView(defaults).command.split('\n');
  assert.equal(lines.length, 6);
  assert.equal(lines[0], 'fluxserve launch ' + String.fromCharCode(92));
  assert.ok(lines[1].includes('--model inclusionAI/LLaDA2.0-mini'));
  assert.ok(lines[2].includes('--tp-size 1'));
  assert.ok(lines[3].includes('--dp-size 1'));
  assert.ok(lines[4].includes('--ep-size 1'));
  assert.equal(lines[5], '  --attention-backend flashinfer');
});

test('model changes enforce available variants and parallelism', () => {
  for (const model of Object.keys(models)) {
    const selection = selectOption({ ...defaults, variant: 'FP8' }, 'model', model);
    const llada = model.startsWith('LLaDA2.');
    const flash = model.endsWith('-flash');
    assert.equal(selection.variant, 'BF16');
    assert.equal(selection.parallel, flash ? '4' : '1');
    assert.equal(optionVisible(selection, 'variant', 'NVFP4'), !llada);
    assert.equal(optionVisible(selection, 'parallel', '1'), !flash);
  }
  assert.equal(defaults.parallel, '1');
});

test('memory labels and Gemma detail match the selected model', () => {
  for (const [model, memory] of [
    ['LLaDA2.0-mini', '33'], ['LLaDA2.1-mini', '33'],
    ['LLaDA2.0-flash', '206'], ['LLaDA2.1-flash', '206'],
    ['diffusion-gemma', '52'],
  ]) {
    const selection = selectOption(defaults, 'model', model);
    const label = optionLabel(selection, 'variant', { value: 'BF16', label: 'BF16' });
    assert.equal(label.replace(/\s/g, ''), 'BF16' + memory + 'GB');
    assert.equal(recipeView(selection).gemmaBF16, model === 'diffusion-gemma');
    assert.ok(recipeView(selection).command.includes(models[model].checkpoint));
  }
});

test('every available model variant has a Hugging Face link', () => {
  for (const [model, recipe] of Object.entries(models)) {
    for (const variant of Object.keys(recipe.variants)) {
      const view = recipeView({ ...defaults, model, variant });
      assert.match(view.variantLink.href, /^https:\/\/huggingface\.co\//);
      assert.ok(view.variantLink.label);
    }
  }
});

test('unsupported combinations disable copying and verification', () => {
  for (const hardware of ['H100', 'GH200', 'B200']) {
    const selection = { ...defaults, hardware };
    assert.equal(recipeView(selection).verified, hardware !== 'H100');
    for (const change of [
      { variant: 'FP8' },
      { variant: 'NVFP4' },
      { model: 'diffusion-gemma', backend: 'fa4' },
    ]) {
      const view = recipeView({ ...selection, ...change });
      assert.equal(view.unsupported, true);
      assert.equal(view.verified, false);
      assert.ok(view.command.startsWith('# '));
    }
  }
});

test('all LLaDA2 recipes generate copyable FA4 commands', () => {
  for (const model of Object.keys(models).filter(model => model.startsWith('LLaDA2.'))) {
    const selection = selectOption(defaults, 'model', model);
    for (const parallel of models[model].parallelism) {
      const view = recipeView({ ...selection, parallel, backend: 'fa4' });
      assert.equal(view.unsupported, false);
      assert.ok(view.command.includes('--attention-backend fa4'));
      assert.ok(view.command.includes('--tp-size ' + parallel));
      assert.ok(view.command.includes('--ep-size ' + parallel));
      assert.ok(view.command.includes(models[model].checkpoint));
    }
  }
});

test('LLaDA2.1 recipes add only the four decoding options', () => {
  for (const model of ['LLaDA2.1-mini', 'LLaDA2.1-flash']) {
    const command = recipeView(selectOption(defaults, 'model', model)).command;
    const options = command.split('\n').slice(1).map(line => line.trim().replace(/ \\$/, ''));
    assert.deepEqual(options, [
      `--model ${models[model].checkpoint}`,
      `--tp-size ${models[model].parallelism[0]}`,
      '--dp-size 1',
      `--ep-size ${models[model].parallelism[0]}`,
      '--parallel-decoding joint_threshold',
      '--threshold 0.7',
      '--editing-threshold 0.5',
      '--max-post-steps 16',
      '--attention-backend flashinfer',
    ]);
  }
});

test('Diffusion-Gemma adds its serving arguments', () => {
  const selection = selectOption(defaults, 'model', 'diffusion-gemma');
  const options = recipeView(selection).command.split('\n').slice(1)
    .map(line => line.trim().replace(/ \\$/, ''));
  assert.deepEqual(options, [
    '--model google/diffusiongemma-26B-A4B-it',
    '--tp-size 1',
    '--dp-size 1',
    '--ep-size 1',
    '--max-num-seqs 4',
    '--max-model-len 8192',
    '--block-length 256',
    '--canvas-length 256',
    '--page-size 256',
    '--attention-backend flashinfer',
    '--scheduler-policy default',
  ]);
});

test('unsupported choices are disabled and switching to Gemma selects FlashInfer', () => {
  const lladaFa4 = selectOption(defaults, 'backend', 'fa4');
  assert.equal(lladaFa4.backend, 'fa4');
  const gemma = selectOption(lladaFa4, 'model', 'diffusion-gemma');
  assert.equal(gemma.backend, 'flashinfer');
  assert.equal(recipeView(gemma).unsupported, false);
  assert.equal(optionEnabled(gemma, 'backend', 'fa4'), false);
  assert.equal(optionEnabled(gemma, 'variant', 'FP8'), false);
  assert.equal(optionEnabled(gemma, 'variant', 'NVFP4'), false);
  assert.deepEqual(selectOption(gemma, 'backend', 'fa4'), gemma);
  assert.deepEqual(selectOption(gemma, 'variant', 'FP8'), gemma);
});
