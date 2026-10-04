FROM golang:1.24-alpine

WORKDIR /app

# Copy the source code
COPY . .

# Download dependencies, tidy, and build
RUN go mod tidy && go build -o main .

# Expose port 8080
EXPOSE 8080

# Command to run the executable
CMD ["./main"]

