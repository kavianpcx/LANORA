FROM golang:1.27.4-alpine AS build
WORKDIR /src
COPY services/api/go.mod services/api/go.sum ./services/api/
WORKDIR /src/services/api
RUN go mod download
COPY services/api/ .
RUN mkdir -p /out/data
RUN CGO_ENABLED=0 go build -mod=readonly -trimpath -ldflags="-s -w" -o /out/lanora-api ./cmd/lanora-api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/lanora-api /lanora-api
COPY --from=build --chown=65532:65532 /out/data /data
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/lanora-api"]
