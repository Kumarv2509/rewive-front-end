# Container build for the Rewive frontend.
#
# Two stages: Node builds the Vite bundle, nginx serves the static output.
# Nothing here talks to a backend — the API is reached same-origin at
# VITE_API_BASE_URL, which Front Door routes to the API container app.
#
# Build:
#   docker build --build-arg VITE_API_BASE_URL=/api -t rewive-frontend:<tag> .
#
# NOTE: never build over a tag that is currently serving. The frontend container
# app runs in Single revision mode with 100% traffic to latest, so overwriting
# the live tag removes the rollback path.

# ---- build ----------------------------------------------------------------
# Vite 8 and rolldown require ^20.19.0 || >=22.12.0; node:22-alpine satisfies
# every engines field in the dependency tree.
FROM node:22-alpine AS build
WORKDIR /app

# The API base path differs by target and is baked in at build time, because
# Vite inlines VITE_* at compile time — it cannot be changed by a container
# env var afterwards.
#
#   /api       Azure. The FastAPI app is mounted at /api with NO version segment.
#   /api/v1    the in-repo default, which is the mock server's contract.
#
# Defaulted to /api here so a container build targets the real API unless told
# otherwise. src/api/client.ts keeps /api/v1 as its own fallback, so local
# development against mock-server is unaffected.
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Dependencies first, so a source-only change reuses this layer.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# tsc -b type-checks (src + vite.config.ts) and then vite builds. A type error
# fails the image build rather than shipping a broken bundle.
RUN npm run build

# ---- serve ----------------------------------------------------------------
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# The container app's ingress targetPort is 80. Changing this means changing
# the ingress in Terraform too.
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
