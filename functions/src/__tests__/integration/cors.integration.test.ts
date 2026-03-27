import express from "express";
import request from "supertest";
import { createStandardCorsMiddleware } from "../../utils/httpMiddleware";

describe("CORS integration", () => {
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (previousAllowedOrigins === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  function createApp() {
    const app = express();
    app.use(createStandardCorsMiddleware());
    app.get("/health", (_req, res) => {
      res.status(200).json({ ok: true });
    });
    return app;
  }

  it("allows configured frontend origins", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOWED_ORIGINS = "https://gestaopedidos-desenhar.web.app,https://atendimento-desenhardigital.web.app";

    const app = createApp();

    const response = await request(app)
      .get("/health")
      .set("Origin", "https://atendimento-desenhardigital.web.app");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://atendimento-desenhardigital.web.app"
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("blocks unknown origins with 403", async () => {
    process.env.NODE_ENV = "production";
    process.env.ALLOWED_ORIGINS = "https://gestaopedidos-desenhar.web.app";

    const app = createApp();

    const response = await request(app)
      .get("/health")
      .set("Origin", "https://evil.example.com");

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Origin not allowed" });
  });
});
