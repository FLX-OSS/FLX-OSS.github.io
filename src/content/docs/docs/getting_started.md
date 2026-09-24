---
title: "Getting Started"
sidebar:
  order: 1
editUrl: "https://github.com/FLX-OSS/FLX-OSS.github.io/edit/main/src/content/docs/docs/getting_started.md"
---

## Prerequisites

- A Linux host with NVIDIA GPUs of compute capability 9.0 or newer.
- An NVIDIA driver compatible with CUDA 12.9+, Docker, and NVIDIA Container Toolkit configured for GPU access.

---

## Build the docker

```bash
docker pull flxoss/fluxserve:v0.1-cu130-fa4
```

---

## Start the workspace

```bash
docker run -itd \
  --shm-size 32g \
  --gpus all \
  --ipc=host \
  --network=host \
  --pid=host \
  --privileged \
  --name flux_workspace \
  fluxserve:v0.1-cu130-fa4 \
  /bin/bash

docker exec -it flux_workspace /bin/bash
```

---

## Install FluxServe inside the container

The image provides the CUDA and Python dependencies. Clone the source inside the container and install the kernel, scheduler, and runtime in that order:

```bash
git clone https://github.com/FLX-OSS/FluxServe
cd FluxServe
export PIP_BREAK_SYSTEM_PACKAGES=1
pip install -e flux-kernel/python/ --no-build-isolation
pip install -e flux-scheduler
pip install -e .
```

---

## Verify Installation

```bash
fluxserve env
fluxserve launch --help
```

---

## Launch
```bash
fluxserve launch \
  --model inclusionAI/LLaDA2.1-mini \
  --host 127.0.0.1 \
  --port 8000 \
  --tp-size 1 \
  --dp-size 1 \
  --ep-size 1
```
For model-specific examples, follow [Model Recipes](/docs/model-recipes/).

---

## Check readiness

In another shell in the same environment:

```bash
curl -fsS http://127.0.0.1:8000/health
```

---

## Send a request

```bash
curl http://127.0.0.1:8000/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "inclusionAI/LLaDA2.0-mini",
    "messages": [{"role": "user", "content": "Explain diffusion language models in a few sentences."}],
    "max_tokens": 128,
    "temperature": 0,
    "stream": false
  }'
```

***
