import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOwnedRepository: vi.fn(),
  scanCreate: vi.fn(),
  scanFind: vi.fn(),
  scanFindOne: vi.fn(),
  executeScan: vi.fn()
}));

vi.mock("../../src/modules/repositories/repository.service.js", () => ({
  repositoryService: {
    getOwnedRepository: mocks.getOwnedRepository
  }
}));

vi.mock("../../src/modules/scans/scan.model.js", () => ({
  Scan: {
    create: mocks.scanCreate,
    find: mocks.scanFind,
    findOne: mocks.scanFindOne
  }
}));

vi.mock("../../src/modules/scans/scan.executor.js", () => ({
  executeScan: mocks.executeScan
}));

const { scanService } = await import("../../src/modules/scans/scan.service.js");

const ownerId = "507f1f77bcf86cd799439011";
const repositoryId = "507f1f77bcf86cd799439012";
const scanId = "507f1f77bcf86cd799439013";

function buildScanDocument() {
  return {
    _id: { toString: () => scanId },
    repositoryId: { toString: () => repositoryId },
    ownerId: { toString: () => ownerId },
    branch: "main",
    status: "queued",
    createdAt: new Date("2026-11-01T00:00:00.000Z"),
    updatedAt: new Date("2026-11-01T00:00:00.000Z")
  };
}

describe("scan service", () => {
  it("creates a queued scan scoped to the owner and triggers execution", async () => {
    mocks.getOwnedRepository.mockResolvedValue({});
    mocks.scanCreate.mockResolvedValue(buildScanDocument());
    mocks.executeScan.mockResolvedValue(undefined);

    const scan = await scanService.createScan(ownerId, repositoryId, {
      branch: "main"
    });

    expect(mocks.getOwnedRepository).toHaveBeenCalledWith(
      ownerId,
      repositoryId
    );
    expect(mocks.scanCreate).toHaveBeenCalledWith({
      repositoryId: expect.anything(),
      ownerId: expect.anything(),
      branch: "main",
      status: "queued"
    });
    expect(scan.id).toBe(scanId);
    expect(scan.status).toBe("queued");

    await vi.waitFor(() =>
      expect(mocks.executeScan).toHaveBeenCalledWith(scanId)
    );
  });

  it("throws a 404 when the scan is not owned by the caller", async () => {
    mocks.scanFindOne.mockReturnValue({
      exec: vi.fn().mockResolvedValue(null)
    });

    await expect(scanService.getScan(ownerId, scanId)).rejects.toMatchObject({
      statusCode: 404,
      code: "SCAN_NOT_FOUND"
    });
  });
});
