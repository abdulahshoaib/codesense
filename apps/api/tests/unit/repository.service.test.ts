import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  find: vi.fn(),
  create: vi.fn(),
  findOneAndUpdate: vi.fn(),
  findOneAndDelete: vi.fn()
}));

vi.mock("../../src/modules/repositories/repository.model.js", () => ({
  Repository: {
    findOne: mocks.findOne,
    find: mocks.find,
    create: mocks.create,
    findOneAndUpdate: mocks.findOneAndUpdate,
    findOneAndDelete: mocks.findOneAndDelete
  }
}));

const { repositoryService } = await import(
  "../../src/modules/repositories/repository.service.js"
);
const { ApiError } = await import("../../src/utils/ApiError.js");

const ownerId = "507f1f77bcf86cd799439011";
const repositoryId = "507f1f77bcf86cd799439012";

function buildRepositoryDocument() {
  return {
    _id: { toString: () => repositoryId },
    ownerId: { toString: () => ownerId },
    name: "codesense",
    url: "https://github.com/codesense/codesense",
    provider: "github",
    defaultBranch: "main",
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    updatedAt: new Date("2026-11-01T00:00:00.000Z")
  };
}

describe("repository service ownership enforcement", () => {
  it("scopes single-repository lookups by owner", async () => {
    mocks.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(buildRepositoryDocument())
    });

    const repository = await repositoryService.getRepository(
      ownerId,
      repositoryId
    );

    expect(mocks.findOne).toHaveBeenCalledTimes(1);
    const filter = mocks.findOne.mock.calls[0]?.[0] as {
      _id: { toString: () => string };
      ownerId: { toString: () => string };
    };
    expect(filter.ownerId.toString()).toBe(ownerId);
    expect(filter._id.toString()).toBe(repositoryId);
    expect(repository.id).toBe(repositoryId);
    expect(repository.provider).toBe("github");
  });

  it("throws a 404 when the repository is not owned by the caller", async () => {
    mocks.findOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null)
    });

    await expect(
      repositoryService.getRepository(ownerId, repositoryId)
    ).rejects.toMatchObject({ statusCode: 404, code: "REPOSITORY_NOT_FOUND" });
  });

  it("scopes delete operations by owner", async () => {
    mocks.findOneAndDelete.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null)
    });

    await expect(
      repositoryService.deleteRepository(ownerId, repositoryId)
    ).rejects.toBeInstanceOf(ApiError);

    const filter = mocks.findOneAndDelete.mock.calls[0]?.[0] as {
      ownerId: { toString: () => string };
    };
    expect(filter.ownerId.toString()).toBe(ownerId);
  });

  it("scopes list queries by owner", async () => {
    mocks.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue([buildRepositoryDocument()])
      })
    });

    const repositories = await repositoryService.listRepositories(ownerId);

    const filter = mocks.find.mock.calls[0]?.[0] as {
      ownerId: { toString: () => string };
    };
    expect(filter.ownerId.toString()).toBe(ownerId);
    expect(repositories).toHaveLength(1);
  });
});
