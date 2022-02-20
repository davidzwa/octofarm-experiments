const { configureContainer } = require("../../container");
const DITokens = require("../../container.tokens");

let service;

beforeAll(async () => {
  const container = configureContainer();
  service = container.resolve(DITokens.serverUpdateService);
});

describe("ServerUpdateService", () => {
  it("should return github releases", async () => {
    await service.syncLatestRelease(false);
    expect(service.getAirGapped()).toBeFalsy();
    expect(service.getLastReleaseSyncState()).toMatchObject({
      // latestReleaseKnown: expect.anything(),
      // loadedWithPrereleases: expect.anything()
      lastCheckTimestamp: expect.any(Number),
      airGapped: false,
      lastReleaseCheckFailed: expect.anything()
    });
  });

  it("should log server update", async () => {
    await service.checkReleaseAndLogUpdate();
  });
});
