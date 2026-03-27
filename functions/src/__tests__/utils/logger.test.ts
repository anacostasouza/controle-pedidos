import { logSecurityEvent } from "../../utils/logger";

describe("logger", () => {
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("masks sensitive metadata in security events", () => {
    logSecurityEvent("auth.denied", {
      email: "usuario@desenhardigital.com.br",
      uid: "abcdef123456",
      authorization: "Bearer very-secret-token",
      nested: {
        apiKey: "my-api-key",
      },
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const payload = warnSpy.mock.calls[0][1] as Record<string, unknown>;

    expect(payload.email).toBe("u***@desenhardigital.com.br");
    expect(payload.uid).toBe("ab***56");
    expect(payload.authorization).toBe("[REDACTED]");
    expect(payload.nested).toEqual({ apiKey: "[REDACTED]" });
  });

  it("logs security events with error level on console.error", () => {
    logSecurityEvent("auth.service_error", { error: "timeout" }, "error");

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
