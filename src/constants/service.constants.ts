export const getSettingsAppearanceDefault = () => ({
  name: "",
});

export function getFileListDefault() {
  return {
    files: [],
    folders: [],
    free: 0,
    total: 0,
  };
}

export function getDefaultPrinterEntry() {
  return {
    settingsAppearance: getSettingsAppearanceDefault(),
    fileList: getFileListDefault(),
  };
}

export const UUID_LENGTH = 32;
export const minPrinterFloorNameLength = 3;