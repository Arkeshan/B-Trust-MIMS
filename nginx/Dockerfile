FROM nginx:alpine

# Copy your configuration file
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Install OpenSSL and generate a self-signed certificate for local testing
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/privkey.pem \
    -out /etc/nginx/certs/fullchain.pem \
    -subj "/C=LK/ST=Western/L=Colombo/O=BTrust/CN=localhost"