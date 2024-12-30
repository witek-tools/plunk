import "dotenv/config";

import {SMTPServer, SMTPServerSession} from "smtp-server";
import {simpleParser} from "mailparser";
import * as fs from "fs";
import signale from "signale";
import * as path from "path";

import {Project} from "@prisma/client";
import Plunk from "@plunk/node";

import {prisma} from "./database/prisma";

export interface CustomSMTPServerSession extends SMTPServerSession {
    project?: Project;
    secret?: string;
}


const keyPath = process.env.KEY_PATH
    ? path.resolve(process.env.KEY_PATH)
    : path.resolve("certs/key.pem");

const certPath = process.env.CERT_PATH
    ? path.resolve(process.env.CERT_PATH)
    : path.resolve("certs/cert.pem");

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    throw new Error(`Certificate files not found. Key: ${keyPath}, Cert: ${certPath}`);
}

const extractRecipients = (to: any): string[] => {
    if (!to) return [];
    const addressObjects = Array.isArray(to) ? to : [to];
    return addressObjects.flatMap((addressObject: any) =>
        addressObject.value
            ?.map((email: any) => email.address)
            .filter((address: string | undefined): address is string => !!address) || []
    );
};

const handleError = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
};

const server = new SMTPServer({
    secure: false, // STARTTLS
    key: fs.readFileSync(keyPath, "utf8"),
    cert: fs.readFileSync(certPath, "utf8"),
    minVersion: "TLSv1.2",

    onAuth: async (auth, session: CustomSMTPServerSession, callback) => {
        const {username: projectId, password: secret} = auth;

        try {
            const project = await prisma.project.findUnique({
                where: {id: projectId},
            });

            if (!project || project.secret !== secret) {
                signale.error("Invalid credentials provided.");
                return callback(new Error("Invalid credentials"));
            }

            session.project = project;
            session.secret = secret;

            signale.success(`Authentication successful for project: ${projectId}`);
            callback(null, {user: projectId});
        } catch (error) {
            const errorMessage = handleError(error);
            signale.error("Error during authentication:", errorMessage);
            callback(new Error("Internal server error"));
        }
    },

    onData: async (stream, session: CustomSMTPServerSession, callback) => {
        try {
            const parsed = await simpleParser(stream);
            const {to, subject, text: body} = parsed;

            if (!session.project || !session.secret) {
                signale.error("Session context is missing: project or secret not set.");
                return callback(new Error("Session context missing"));
            }

            if (!subject || !body || !to) {
                signale.warn("Missing required email parameters: subject, body, or recipients.");
                return callback(new Error("Send parameters missing"));
            }

            const plunkApiUrl = process.env.PLUNK_API_URL ?? undefined;
            const plunk = new Plunk(session.secret, {baseUrl: plunkApiUrl});

            const recipients = extractRecipients(to);
            if (recipients.length === 0) {
                signale.warn("No valid recipients found in the email.");
                return callback(new Error("No valid recipients found in the email"));
            }

            signale.info(`Sending email to: ${recipients.join(", ")}`);

            const response = await plunk.emails.send({
                from: session.project.email ?? undefined,
                to: recipients,
                subject,
                type: "html",
                body,
            });

            signale.success(`Email successfully sent to: ${recipients.join(", ")}`);
            signale.debug("Plunk SDK response:", response);

            callback();
        } catch (error) {
            const errorMessage = handleError(error);
            signale.error("Error while processing the email:", errorMessage);
            callback(new Error(errorMessage));
        }
    },
});

const PORT = parseInt(process.env.PORT || "587", 10);

server.listen(PORT, () => {
    signale.info(`SMTP server is running on port ${PORT}`);
});
