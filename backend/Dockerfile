FROM golang:1.24-alpine

# Install SSL root certificates (for Gmail SMTP TLS) and timezone data
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the source code
COPY . .

# Download dependencies, tidy, and build
RUN go mod tidy && go build -o main .

# Expose port 8080
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
