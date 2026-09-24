---
title: Serving Parameters
sidebar:
  label: Configuration
  order: 2
head:
  - tag: title
    content: Confguration
description: CLI parameter configurations for FluxServe.
editUrl: false
---

These options are defined for `fluxserve launch` in `python/fluxserve/cli.py`. Defaults below are CLI defaults; the recipes further down override some of them. `bench` and `bench_offline` define their options in separate modules.

## Engine arguments

| Parameter | Purpose |
| --- | --- |
| `--host` | Server bind address. Default: `0.0.0.0`. |
| `--port` | Server port. Default: `8000`. |
| `--device` | GPU device specification. Default: `cuda`. |
| `--gpu-memory-utilization` | GPU memory utilization fraction passed to automatic KV-page profiling. Default: `0.90`. |
| `--gpu-memory-safety-reserve` | Safety reserve fraction passed to automatic KV-page profiling. Default: `0.05`. |
| `--kv-cache-layout` | KV-cache layout: `dense` or `paged`. Default: `paged`. |
| `--page-size` | KV-cache page size. Default: unset; scheduler page size falls back to `--block-length`. Paged scheduler policies require it to equal `--block-length`. |


## Model arguments

| Parameter | Purpose |
| --- | --- |
| `--model` / `--model-name` | Required model checkpoint directory or Hugging Face model ID. Loads both the model configuration and tokenizer from this location. |
| `--max-model-len` | Maximum model sequence length. Default: `2048`. Must be divisible by `--block-length` for paged scheduler policies. |
| `--max-new-tokens` | Runner generation-length setting. Default: `128`. |
| `--trust-remote-code` | Allow remote model/tokenizer code when loading the checkpoint. Already `true` by default; this parser provides no disabling flag. |


## Scheduler arguments

| Parameter | Purpose |
| --- | --- |
| `--max-num-seqs` | Maximum scheduler batch size / concurrent sequences. Default: `8`. Also bounds decode CUDA graph batch sizes. |
| `--max-scheduled-tokens` | Scheduler token budget. Default: `512`. Must be divisible by `--block-length` for paged scheduler policies. |
| `--scheduler-policy` | Select `paged` or `dynamic`. Default: `paged`. Both require FlashInfer with paged prefill, paged cache mode, and paged KV layout. |
| `--scheduler-num-device-pages` | Number of device KV-cache pages. Default: `0`; nonpositive values trigger automatic profiling when paged KV pages are needed. |

## Attention arguments

| Parameter | Purpose |
| --- | --- |
| `--attention-backend` | Select `sdpa`, `flashinfer`, or `fa4`. Default: `flashinfer`. |
| `--use-cuda-graph` | Enable the runner's general CUDA graph flag. Default: `False`. |
| `--use-prefill-cuda-graph` | Enable prefill CUDA graphs. Default: `False`. (experiemental). |
| `--use-decode-cuda-graph` | Enable decode CUDA graphs. Default: `False`. |
| `--cuda-graph-decode-mode` | Decode graph mode: `decomposed` or `padded`. Default: `padded`. |
| `--cuda-graph-capture-bs` | Space-separated decode graph batch sizes, for example `1 2 4 8`. Defaults to `1` plus every positive even size up to `--max-num-seqs`. Values cannot exceed `--max-num-seqs`. |
| `--cuda-graph-capture-sizes` | Space-separated prefill sequence-length buckets. Default: `64 128 256 512 1024`. Only positive, block-aligned values no greater than `--max-model-len` are retained (experiemental). |

## Decoding arguments

| Parameter | Purpose |
| --- | --- |
| `--block-length` | Diffusion decoding block length for LLaDA2.X. Default: `64`. For checkpoints with MoE block routing, it must be a multiple of the checkpoint's routing block size. |
| `--canvas-length` | Diffusion canvas length for Diffusion-Gemma. Default: `128`. |
| `--max-denoising-steps` | Override checkpoint denoising steps, primarily for smoke tests. Default: unset. |
| `--parallel-decoding` | Parallel decoder name. Default: `threshold`. This CLI also references `joint_threshold` for LLaDA2.1 and `levenshtein_joint` for LLaDA2.2; the parser does not restrict choices. |
| `--threshold` | Decoding confidence threshold. Default: `0.9`. |
| `--low-threshold` | Low confidence threshold passed to the decoder. Default: `0.3`. |
| `--editing-threshold` | LLaDA2.1 Token-to-Token editing threshold for `joint_threshold`. Default: `0.5` (Quality preset); the Speed preset uses `0.0`. |
| `--max-post-steps` | Maximum post-mask editing iterations per block for `joint_threshold`. Default: `16`. |



## Parallelism arguments

| Parameter | Purpose |
| --- | --- |
| `--tp-size` | Tensor-parallel size. Default: `1`. Used to decide whether to launch local distributed workers. |
| `--dp-size` | Data-parallel size passed to the server configuration. Default: `1`. |
| `--ep-size` | Expert-parallel size passed to the server configuration. Default: `1`. |
| `--enable-dp-attention` | Enable data-parallel attention in the server configuration. Off by default. |
| `--distributed-backend` | Backend used to initialize distributed execution. Default: `nccl`. |
