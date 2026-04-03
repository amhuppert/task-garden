import { describe, expect, it } from "vitest";
import { detectLinkPreset } from "./resource-link-preset";

describe("detectLinkPreset", () => {
  describe("GitHub detection", () => {
    it("returns github for github.com URLs", () => {
      expect(
        detectLinkPreset("https://github.com/org/repo", "external_url"),
      ).toBe("github");
    });

    it("returns github for self-hosted hostname containing github", () => {
      expect(
        detectLinkPreset(
          "https://github.corp.example.com/org/repo",
          "external_url",
        ),
      ).toBe("github");
    });

    it("returns github with mixed-case hostname", () => {
      expect(
        detectLinkPreset("https://GitHub.COM/org/repo", "external_url"),
      ).toBe("github");
    });
  });

  describe("GitLab detection", () => {
    it("returns gitlab for gitlab.com URLs", () => {
      expect(
        detectLinkPreset("https://gitlab.com/group/project", "external_url"),
      ).toBe("gitlab");
    });

    it("returns gitlab for self-hosted hostname containing gitlab", () => {
      expect(
        detectLinkPreset(
          "https://gitlab.internal.example.com/group/project",
          "external_url",
        ),
      ).toBe("gitlab");
    });

    it("returns gitlab with mixed-case hostname", () => {
      expect(
        detectLinkPreset(
          "https://GitLab.Example.COM/group/project",
          "external_url",
        ),
      ).toBe("gitlab");
    });
  });

  describe("JIRA detection", () => {
    it("returns jira for atlassian.net URLs without /wiki/", () => {
      expect(
        detectLinkPreset(
          "https://company.atlassian.net/browse/ABC-123",
          "external_url",
        ),
      ).toBe("jira");
    });

    it("returns jira for self-hosted hostname containing jira", () => {
      expect(
        detectLinkPreset(
          "https://jira.corp.example.com/browse/PROJ-1",
          "external_url",
        ),
      ).toBe("jira");
    });

    it("returns jira with mixed-case hostname", () => {
      expect(
        detectLinkPreset(
          "https://JIRA.Corp.Example.COM/browse/PROJ-1",
          "external_url",
        ),
      ).toBe("jira");
    });
  });

  describe("Confluence detection", () => {
    it("returns confluence for atlassian.net URLs with /wiki/", () => {
      expect(
        detectLinkPreset(
          "https://company.atlassian.net/wiki/spaces/ENG",
          "external_url",
        ),
      ).toBe("confluence");
    });

    it("returns confluence for self-hosted hostname containing confluence", () => {
      expect(
        detectLinkPreset(
          "https://confluence.corp.example.com/display/ENG",
          "external_url",
        ),
      ).toBe("confluence");
    });

    it("returns confluence with mixed-case hostname", () => {
      expect(
        detectLinkPreset(
          "https://Confluence.Example.COM/display/TEAM",
          "external_url",
        ),
      ).toBe("confluence");
    });
  });

  describe("bundled document fallback", () => {
    it("returns file for bundled_document kind", () => {
      expect(detectLinkPreset("memory-bank/focus.md", "bundled_document")).toBe(
        "file",
      );
    });
  });

  describe("external fallback", () => {
    it("returns external for unrecognized external URLs", () => {
      expect(
        detectLinkPreset("https://example.com/something", "external_url"),
      ).toBe("external");
    });
  });

  describe("malformed URLs", () => {
    it("returns external for a malformed URL instead of throwing", () => {
      expect(detectLinkPreset("not-a-valid-url", "external_url")).toBe(
        "external",
      );
    });

    it("returns external for an empty string with external_url kind", () => {
      expect(detectLinkPreset("", "external_url")).toBe("external");
    });
  });
});
