---
title: Nemotron-Labs-Diffusion
description: Launch recipes for Nemotron-Labs-Diffusion 3B, 8B, and 14B.
editUrl: false
---

Choose a checkpoint size and decoding method. Threshold decoding supports FlashInfer and FA4; self speculation requires FA4. These recipes use one GPU and paged KV cache. The block length must be a multiple of 32.

The commands follow the [FluxServe Nemotron serving guide](https://github.com/FLX-OSS/FluxServe/blob/main/docs/serving/nemotron/nemotron-labs-diffusion.md). See [Configuration](/docs/configuration/) for all serving parameters.
