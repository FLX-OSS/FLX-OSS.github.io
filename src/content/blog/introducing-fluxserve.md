---
title: "FluxServe: A Flexible and High-Performance Inference Engine for Open Diffusion Language Models"
description: We are excited to announce FluxServe, a new inference engine built specifically for open diffusion language models. FluxServe is designed and implemented to deliver low latency and high throughput for autoregressive (AR) diffusion models through an optimized attention runtime, dynamic block-level scheduling, and efficient multi-GPU serving.
date: 2026-09-27
author: FluxServe Team
draft: false
---

Recently, diffusion large language models (dLLMs) have emerged as a highly promising alternative to traditional autoregressive (AR) LLMs. The rapidly growing popularity of dLLMs stems from their unique architectural advantage: combining long-horizon causal sequencing with high-fidelity iterative refinement, allowing multiple tokens to be denoised simultaneously in a bidirectional manner. Exemplified by recent open-weight releases, dLLMs offer compelling generative capabilities with superior compute utilization, promoting a more efficient token economy for modern AI workloads.

### What is a Diffusion Language Model (dLLM)?

Diffusion models are a well-established class of generative models that learn to transform noise into data through an iterative denoising process. While widely adopted in image and video generation—where models progressively refine random noise into high-quality visuals—applying diffusion to language is a rapidly emerging frontier. 

Instead of predicting text token-by-token, dLLMs take a block of masked tokens and gradually refine them into coherent text. This unique parallel decoding structure provides dLLMs with bidirectional context and enables block-level parallelism during generation. However, this also introduces significant challenges for existing AR serving stacks. Because current inference components are heavily optimized for sequential token generation, they are fundamentally sub-optimal for the block-level workloads required by dLLMs.

<div data-block-diffusion-slot></div>

### FluxServe Overview

[FluxServe](https://github.com/FLX-OSS/FluxServe) is a lightweight and high-performance serving engine engineered specifically for diffusion language models. It is designed to deliver low-latency and high-throughput inference for autoregressive diffusion models across a variety of hardware setups, ranging from single-GPU batched inference to multi-GPU distributed serving.

At launch, FluxServe’s core features include:

- **Native Block-Causal Attention**: FluxServe implements an efficient block-causal attention runtime tailored for AR diffusion in real-world scenarios. It supports both variable-length (varlen) prefill and varlen block-decode, with backend support for both FlashInfer and FA4.
- **Dynamic Request Scheduler**: FluxServe features a hybrid scheduling architecture, pairing a low-overhead C++ control plane with a Python execution plane. This enables the fine-grained, block-level request management essential for diffusion models.
- **Unified Diffusion Playground**: FluxServe provides native support for a wide range of open diffusion language models, such as [LLaDA 2.X](https://github.com/inclusionAI/LLaDA2.X) and [Diffusion-Gemma](https://huggingface.co/google/diffusiongemma-26B-A4B-it), establishing a standardized benchmarking platform for both academic researchers and industry practitioners.

### Performance Results

Here, we present preliminary benchmark results comparing FluxServe against SGLang. To ensure a fair comparison, we launched both engines as API endpoints and utilized the third-party evaluation tool [evalscope](https://github.com/modelscope/evalscope) to measure system performance across multiple datasets. 

The figure below highlights the LLaDA 2.0 and 2.1 performance of FluxServe versus SGLang. Across four different model configurations, FluxServe achieves a consistent decode throughput improvement over AR-oriented serving stacks, delivering an average speedup of 1.6x.


<div data-benchmark-slot></div>


### Roadmaps

### Short-term Implementations
- Extensive Model Support: [Nemotron-Labs-Diffusion](https://github.com/FLX-OSS/FluxServe/pull/14)
- Advanced Quantization: FP8 & NVFP4
- NVIDIA Blackwell GPU Support
- Production Model Gateway: gRPC


### Long-term Goals
- AMD ROCm Support
- Multi-Modal Diffusion Support


### External Contributions
FluxServe is built as a lightweight and performance-oriented serving infrastructure project. Due the widespread use of AI agents, we will be intentionally selective about the submitted PRs, and conduct thorough discussion and validation before merging.
We appreciate everyone's ideas, support and feedback to our project.
We welcome external contributions, especially:
- Obvious bug fixes
- Performance optimizations that fit the existing codebase style without additional unnecessary complexity
- Documentation, tooling, and benchmarking improvements

### Acknowledgements

Our system design was inspired by, and incorporates reused code from, the following incredible projects: [vLLM](https://github.com/vllm-project/vllm), [SGLang](https://github.com/sgl-project/sglang), [TokenSpeed](https://github.com/lightseekorg/tokenspeed), [dInfer](https://github.com/inclusionAI/dInfer), [FlashInfer](https://github.com/flashinfer-ai/flashinfer/pull/2722), and [Flash-Attention](https://github.com/dao-ailab/flash-attention).
### Citation

```bibtex
@misc{fluxserve2026,
  author = {{FluxServe Team}},
  title = {FluxServe: A Flexible and High-Performance Inference Engine for Open Diffusion Language Models},
  year = {2026},
  month = {September},
  howpublished = {\url{[https://github.com/FLX-OSS/FluxServe](https://github.com/FLX-OSS/FluxServe)}}
}
```

### Contributors

- Project Lead & Creator: [Youpeng Zhao](https://kennethzhao24.github.io/)
- Model Runtime: [Meiling Wang](https://meiling0131.github.io/), [Depng Zhu](https://github.com/zhudp3)
- Benchmark & Documentation: [Zhiben Chen](https://www.linkedin.com/in/zhiben-chen/), [Ziyan Wang](https://www.linkedin.com/in/ziyan-wang-00a163228/) 

