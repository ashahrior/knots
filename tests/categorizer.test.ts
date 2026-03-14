import { describe, it, expect } from "vitest";
import { categorize } from "../src/background/categorizer";

describe("categorize", () => {
  it("returns 'Video' for YouTube URLs", () => {
    expect(categorize("https://www.youtube.com/watch?v=abc123")).toBe("Video");
    expect(categorize("https://youtube.com/watch?v=abc123")).toBe("Video");
    expect(categorize("https://youtu.be/abc123")).toBe("Video");
  });

  it("returns 'Video' for Vimeo and Twitch", () => {
    expect(categorize("https://vimeo.com/123456")).toBe("Video");
    expect(categorize("https://www.twitch.tv/channel")).toBe("Video");
  });

  it("returns 'Article' for blog platforms", () => {
    expect(categorize("https://medium.com/@user/article-slug")).toBe("Article");
    expect(categorize("https://blog.substack.com/p/post")).toBe("Article");
    expect(categorize("https://dev.to/user/post")).toBe("Article");
    expect(categorize("https://hashnode.com/post/abc")).toBe("Article");
  });

  it("returns 'Code' for code hosting platforms", () => {
    expect(categorize("https://github.com/user/repo")).toBe("Code");
    expect(categorize("https://gitlab.com/user/repo")).toBe("Code");
    expect(categorize("https://bitbucket.org/user/repo")).toBe("Code");
  });

  it("returns 'Q&A' for Stack Exchange sites", () => {
    expect(categorize("https://stackoverflow.com/questions/12345")).toBe("Q&A");
    expect(categorize("https://askubuntu.com/questions/12345")).toBe("Q&A");
  });

  it("returns 'Forum' for Reddit and HN", () => {
    expect(categorize("https://www.reddit.com/r/javascript")).toBe("Forum");
    expect(categorize("https://news.ycombinator.com/item?id=123")).toBe("Forum");
  });

  it("returns 'Social' for social media platforms", () => {
    expect(categorize("https://twitter.com/user")).toBe("Social");
    expect(categorize("https://x.com/user")).toBe("Social");
    expect(categorize("https://www.linkedin.com/in/user")).toBe("Social");
    expect(categorize("https://bsky.app/profile/user")).toBe("Social");
  });

  it("returns 'News' for news sites", () => {
    expect(categorize("https://techcrunch.com/2024/01/01/post")).toBe("News");
    expect(categorize("https://www.bbc.com/news/article")).toBe("News");
    expect(categorize("https://arstechnica.com/article")).toBe("News");
  });

  it("returns 'Learning' for education platforms", () => {
    expect(categorize("https://www.coursera.org/learn/ml")).toBe("Learning");
    expect(categorize("https://leetcode.com/problems/two-sum")).toBe("Learning");
    expect(categorize("https://freecodecamp.org/news/post")).toBe("Learning");
  });

  it("returns 'AI' for AI platforms", () => {
    expect(categorize("https://chat.openai.com/chat")).toBe("AI");
    expect(categorize("https://claude.ai/chat")).toBe("AI");
  });

  it("returns 'Research' for academic sites", () => {
    expect(categorize("https://arxiv.org/abs/2301.00001")).toBe("Research");
    expect(categorize("https://scholar.google.com/scholar?q=test")).toBe("Research");
  });

  it("returns 'Webpage' for unknown domains", () => {
    expect(categorize("https://example.com")).toBe("Webpage");
    expect(categorize("https://my-blog.com/post")).toBe("Webpage");
  });

  it("returns 'Webpage' when disabled regardless of domain", () => {
    expect(categorize("https://youtube.com/watch?v=abc", false)).toBe("Webpage");
    expect(categorize("https://github.com/user/repo", false)).toBe("Webpage");
  });

  it("handles invalid URLs gracefully", () => {
    expect(categorize("not-a-url")).toBe("Webpage");
    expect(categorize("")).toBe("Webpage");
  });

  it("handles subdomains correctly", () => {
    expect(categorize("https://music.youtube.com/watch?v=abc")).toBe("Music");
    expect(categorize("https://user.substack.com/p/post")).toBe("Article");
  });
});
