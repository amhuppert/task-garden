import { describe, expect, it } from "vitest";
import {
  getColorModeLabel,
  getScopeLabel,
  getSizeModeLabel,
} from "./plan-toolbar.helpers";

describe("getScopeLabel", () => {
  it("'all' → 'All items'", () =>
    expect(getScopeLabel("all")).toBe("All items"));
  it("'upstream' → 'Upstream'", () =>
    expect(getScopeLabel("upstream")).toBe("Upstream"));
  it("'downstream' → 'Downstream'", () =>
    expect(getScopeLabel("downstream")).toBe("Downstream"));
  it("'chain' → 'Full chain'", () =>
    expect(getScopeLabel("chain")).toBe("Full chain"));
});

describe("getColorModeLabel", () => {
  it("'default' → 'Default'", () =>
    expect(getColorModeLabel("default")).toBe("Default"));
  it("'lane' → 'By Lane'", () =>
    expect(getColorModeLabel("lane")).toBe("By Lane"));
  it("'status' → 'By Status'", () =>
    expect(getColorModeLabel("status")).toBe("By Status"));
  it("'priority' → 'By Priority'", () =>
    expect(getColorModeLabel("priority")).toBe("By Priority"));
  it("'degree' → 'By Degree'", () =>
    expect(getColorModeLabel("degree")).toBe("By Degree"));
  it("'betweenness' → 'By Betweenness'", () =>
    expect(getColorModeLabel("betweenness")).toBe("By Betweenness"));
  it("'dependency_span' → 'By Dependency Span'", () =>
    expect(getColorModeLabel("dependency_span")).toBe("By Dependency Span"));
});

describe("getSizeModeLabel", () => {
  it("'uniform' → 'Uniform'", () =>
    expect(getSizeModeLabel("uniform")).toBe("Uniform"));
  it("'degree' → 'By Degree'", () =>
    expect(getSizeModeLabel("degree")).toBe("By Degree"));
  it("'betweenness' → 'By Betweenness'", () =>
    expect(getSizeModeLabel("betweenness")).toBe("By Betweenness"));
  it("'dependency_span' → 'By Dependency Span'", () =>
    expect(getSizeModeLabel("dependency_span")).toBe("By Dependency Span"));
});
