import {
  createSecurityHeadersMiddleware,
  createStandardCorsMiddleware,
  isKnownOrigin,
} from "../../utils/httpMiddleware";

type MockResponse = {
  set: jest.Mock;
  status: jest.Mock;
  end: jest.Mock;
  send: jest.Mock;
  json: jest.Mock;
};

function createMockResponse(): MockResponse {
  const res = {
    set: jest.fn(),
    status: jest.fn(),
    end: jest.fn(),
    send: jest.fn(),
    json: jest.fn(),
  } as unknown as MockResponse;

  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

describe("httpMiddleware", () => {
  const previousAllowedOrigins = process.env.ALLOWED_ORIGINS;
  const previousAllowedOriginsProduction = process.env.ALLOWED_ORIGINS_PRODUCTION;
  const previousAllowedOriginsDevelopment = process.env.ALLOWED_ORIGINS_DEVELOPMENT;
  const previousNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (previousAllowedOrigins === undefined) {
      delete process.env.ALLOWED_ORIGINS;
    } else {
      process.env.ALLOWED_ORIGINS = previousAllowedOrigins;
    }

    if (previousAllowedOriginsProduction === undefined) {
      delete process.env.ALLOWED_ORIGINS_PRODUCTION;
    } else {
      process.env.ALLOWED_ORIGINS_PRODUCTION = previousAllowedOriginsProduction;
    }

    if (previousAllowedOriginsDevelopment === undefined) {
      delete process.env.ALLOWED_ORIGINS_DEVELOPMENT;
    } else {
      process.env.ALLOWED_ORIGINS_DEVELOPMENT = previousAllowedOriginsDevelopment;
    }

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  });

  describe("isKnownOrigin", () => {
    it("returns true for allowed localhost origin", () => {
      expect(isKnownOrigin("http://localhost:5173")).toBe(true);
    });

    it("returns false for unknown origin", () => {
      expect(isKnownOrigin("https://example.com")).toBe(false);
    });

    it("returns true for configured ALLOWED_ORIGINS origin", () => {
      process.env.ALLOWED_ORIGINS = "https://allowed.example.com";
      expect(isKnownOrigin("https://allowed.example.com")).toBe(true);
    });

    it("returns false when origin is not in ALLOWED_ORIGINS", () => {
      process.env.ALLOWED_ORIGINS = "https://allowed.example.com";
      expect(isKnownOrigin("https://other.example.com")).toBe(false);
    });

    it("uses ALLOWED_ORIGINS_PRODUCTION when NODE_ENV is production", () => {
      process.env.NODE_ENV = "production";
      process.env.ALLOWED_ORIGINS_PRODUCTION = "https://prod.example.com";
      process.env.ALLOWED_ORIGINS = "https://fallback.example.com";

      expect(isKnownOrigin("https://prod.example.com")).toBe(true);
      expect(isKnownOrigin("https://fallback.example.com")).toBe(false);
    });

    it("uses ALLOWED_ORIGINS_DEVELOPMENT when NODE_ENV is development", () => {
      process.env.NODE_ENV = "development";
      process.env.ALLOWED_ORIGINS_DEVELOPMENT = "https://dev.example.com";
      process.env.ALLOWED_ORIGINS = "https://fallback.example.com";

      expect(isKnownOrigin("https://dev.example.com")).toBe(true);
      expect(isKnownOrigin("https://fallback.example.com")).toBe(false);
    });
  });

  describe("createStandardCorsMiddleware", () => {
    it("does not set allow-origin when request has no origin header", () => {
      const middleware = createStandardCorsMiddleware();
      const req = { headers: {}, method: "GET" } as any;
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res as any, next);

      expect(res.set).not.toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("sets allow-origin to trusted origin", () => {
      const middleware = createStandardCorsMiddleware();
      const req = { headers: { origin: "http://localhost:5173" }, method: "GET" } as any;
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res as any, next);

      expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Origin", "http://localhost:5173");
      expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Credentials", "true");
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("blocks unknown origin with 403", () => {
      const middleware = createStandardCorsMiddleware();
      const req = { headers: { origin: "https://evil.example.com" }, method: "GET" } as any;
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res as any, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: "Origin not allowed" });
      expect(next).not.toHaveBeenCalled();
    });

    it("ends preflight with status 200 in default mode", () => {
      const middleware = createStandardCorsMiddleware();
      const req = { headers: { origin: "http://localhost:5173" }, method: "OPTIONS" } as any;
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res as any, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalledTimes(1);
      expect(next).not.toHaveBeenCalled();
    });

    it("sends preflight response in send mode", () => {
      const middleware = createStandardCorsMiddleware({ preflightMode: "send" });
      const req = { headers: { origin: "http://localhost:5173" }, method: "OPTIONS" } as any;
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res as any, next);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.end).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("createSecurityHeadersMiddleware", () => {
    it("sets all expected security headers", () => {
      const middleware = createSecurityHeadersMiddleware();
      const req = {} as any;
      const res = createMockResponse();
      const next = jest.fn();

      middleware(req, res as any, next);

      expect(res.set).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
      expect(res.set).toHaveBeenCalledWith("X-Frame-Options", "DENY");
      expect(res.set).toHaveBeenCalledWith("X-XSS-Protection", "1; mode=block");
      expect(res.set).toHaveBeenCalledWith("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
