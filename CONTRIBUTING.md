# Contributing

You can greatly support Plunk by contributing to this repository.

Support can be asked in the `#contributions` channel of the [Plunk Discord server](https://useplunk.com/discord)

### 1. Requirements

- Docker needs to be [installed](https://docs.docker.com/engine/install/) on your system.

### 2. Install dependencies

- Run `yarn install` to install the dependencies.

### 3. Set your environment variables

- Copy the `.env.example` files in the `api`, `dashboard`, `prisma`, and `smtp-server` folders to `.env` in their respective folders.
- Set AWS credentials in the `api` `.env` file.
- For the `smtp-server`, configure `KEY_PATH` and `CERT_PATH` in the `.env` file. Certificates are required to enable secure (TLS) communication.

### 4. Start resources

- Run `yarn services:up` to start a local database and a local redis server.
- Run `yarn migrate` to apply the migrations to the database.
- Run `yarn build:shared` to build the shared package.

### 5. Start the servers

- Run `yarn dev:api` to start the API server.
- Run `yarn dev:dashboard` to start the dashboard server.
- *(Optional)* Run `yarn dev:smtp-server` to start the SMTP server. This is only needed if you want to test SMTP functionality locally.

### 6. Certificates for the SMTP server

To run the `smtp-server`, you need to provide SSL/TLS certificates. These certificates ensure secure communication over port 587. Below are the options for certificates:

#### **Production**

For production environments, you should use a certificate issued by a trusted Certificate Authority (CA). These certificates are typically issued for your domain and require DNS verification.

- **KEY_PATH**: Path to your private key file (e.g., `key.pem`).
- **CERT_PATH**: Path to your certificate file (e.g., `cert.pem`).

#### **Development**

For development purposes, you can use a **self-signed certificate**. While this is not recommended for production, it is a simple way to enable secure communication locally. Below is a quick guide to generating a self-signed certificate:

1. Run the following command to generate a key and certificate:
   ```bash
   openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
   ```
- This will generate `key.pem` (private key) and `cert.pem` (self-signed certificate).
- Use `-nodes` to skip setting a password for the private key.
- The Common Name (CN) must match the hostname of the `smtp-server` (e.g., `localhost`).

2. Place the `key.pem` and `cert.pem` files in the `packages/smtp-server/certs` folder.

3. Update your `.env` file with the following:
   ```
   KEY_PATH=packages/smtp-server/certs/key.pem
   CERT_PATH=packages/smtp-server/certs/cert.pem
   ```

4. Now you can start the SMTP server for development using:
   ```bash
   yarn dev:smtp-server
   ```

**Note:** When using self-signed certificates, email clients or testing tools may warn that the connection is not secure. This is expected in a development environment.

### 7. Testing the SMTP server (optional)

If you decide to run the `smtp-server`, ensure the following:

1. Certificates are properly configured in the `.env` file (`KEY_PATH` and `CERT_PATH`).
2. The server will listen on port `587` by default. You can change this in the `.env` file.
3. Use an SMTP client (e.g., Telnet, Python's `smtplib`, or an email client) to test sending emails to the `smtp-server`.
