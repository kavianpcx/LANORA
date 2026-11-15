FROM golang:1.27.4-alpine AS build
WORKDIR /src
COPY services/api/go.mod ./services/api/go.mod
WORKDIR /src/services/api
RUN go mod download
COPY services/api/ .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/lanora-api ./cmd/lanora-api

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/lanora-api /lanora-api
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/lanora-api"]
