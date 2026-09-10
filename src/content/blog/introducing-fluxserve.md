---
title: "FluxServe: A Flexible and High-Performance Inference Engine for Open Diffusion Language Models"
description: We are execited to announce FluxServe, a new inference engine for open diffusion langauge models. FluxServe is desigend and implemented to deliver low-latency and high-throughput for autoregressive (AR) diffusion models with optimized attention runtime, dynamic block-level scheduling and efficient multi-GPU serving. 
date: 2026-09-15
author: FluxServe Team
draft: false
---

Recently, diffusion large language models (dLLMs) have emerged as a highly promising alternative paradigm to their AR-based LLM counterparts. 
The rapidly growing popularity of dLLMs stems from their unique architectural advantages of combining long-horizon casual sequencing with high-fidelity iterative refinement, where multiple tokens can be denoised at once in a bidirectional manner.
Exemplified by models such as LLaDA, Diffusion-Gemma, and Mercury, dLLMs offer compelling generative capabilities with better compute utilization that promotes a more efficient token economy for modern AI workloads.

### FluxServe Overview

Diffusion language models refine multiple token positions over a sequence of steps. That workload behaves differently from traditional autoregressive decoding, where generation advances one token at a time.

FluxServe uses block-level scheduling to keep requests moving efficiently while supporting variable-length prefill and decoding. Paged KV caching and CUDA graph support help reduce overhead along the way.

### Performance Results


### Acknowledgements


### What comes next

We plan to use this blog for engineering notes, release updates, benchmarks, and deeper explanations of the ideas behind FluxServe.

For a closer look at the system today, read the [architecture overview](/docs/architecture/).
