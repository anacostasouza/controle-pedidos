import { describe, expect, it } from "vitest";
import { formatarTempo, formatarTempoHHMMSS } from "./timeUtils";

describe("timeUtils", () => {
  it("formatarTempoHHMMSS retorna hh:mm:ss quando >= 1h", () => {
    expect(formatarTempoHHMMSS(3661)).toBe("01:01:01");
  });

  it("formatarTempoHHMMSS retorna mm:ss quando < 1h", () => {
    expect(formatarTempoHHMMSS(125)).toBe("02:05");
  });

  it("formatarTempo retorna hh:mm:ss quando >= 1h", () => {
    expect(formatarTempo(3605)).toBe("01:00:05");
  });

  it("formatarTempo retorna mm:ss quando < 1h", () => {
    expect(formatarTempo(95)).toBe("01:35");
  });
});
