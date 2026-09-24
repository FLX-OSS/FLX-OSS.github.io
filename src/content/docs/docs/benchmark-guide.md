---
title: Benchmark Guide
sidebar:
  order: 4
description: Measure FluxServe latency and throughput with online or offline benchmarks.
editUrl: false
---

FluxServe provides both internal online serving offline batched inference benchmark. 

## Prepare a dataset

Both benchmarks accept a JSONL file containing one JSON object per line. Each row requires a non-empty `messages` array. `max_tokens`, request parameters, and optional metadata may also be included.

```json
{"messages":[{"role":"user","content":"Explain diffusion language models briefly."}],"max_tokens":128,"metadata":{"task_id":"example-1"}}
{"messages":[{"role":"user","content":"Write a Python function that reverses a list."}],"max_tokens":256,"metadata":{"task_id":"example-2"}}
```
Save these lines as `data/benchmark.jsonl`. Each `metadata.task_id` must be unique when provided.

## Online benchmark

The online benchmark measures the full HTTP serving path, including scheduling, execution, and transport overhead.
Use a command from [Model Recipes](/docs/model-recipes/).

```bash
fluxserve launch \
  --model inclusionAI/LLaDA2.0-mini \
  --host 127.0.0.1 \
  --port 8000 \
  --tp-size 1 \
  --dp-size 1 \
  --ep-size 1 \
  --max-num-seqs 4 \
  --attention-backend flashinfer

curl -fsS http://127.0.0.1:8000/health

fluxserve bench serve \
  --model inclusionAI/LLaDA2.0-mini \
  --dataset ./data/benchmark.jsonl \
  --num-prompts 100 \
  --dataset-output-len 128 \
  --request-rate 1 \
  --max-concurrency 4 \
  --metric-percentiles 50,90,95,99 \
  --save-result
```

## Offline benchmark

The offline runner loads the model directly and runs batched inference:

```bash
fluxserve bench_offline \
  --model inclusionAI/LLaDA2.0-mini \
  --dataset ./data/benchmark.jsonl \
  --batch-size 4 \
  --mini-batch-size 4 \
  --gen-len 128 \
  --block-length 64 \
  --tp-size 1 \
  --dp-size 1 \
  --ep-size 1 \
  --attention-backend flashinfer \
  --output-dir runs/detailed_results \
  --log-file runs/benchmark.log
```

## Third-Party benchmark

We also provide scripts to benchmark FluxServe using third-party evalscope to directly measure the serving throughput through openai-compaitible API. 
