import type { DriveData } from '../types.ts';

const FOLDER_NAME = 'MQL5 Quantum Generator Data';
const FILE_NAME = 'mql5_quantum_backup.json';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const FILE_MIME_TYPE = 'application/json';

/**
 * Finds a folder by name in the user's Google Drive.
 * @returns {Promise<string | null>} The folder ID or null if not found.
 */
const findFolder = async (): Promise<string | null> => {
    try {
        // @ts-ignore
        const response = await gapi.client.drive.files.list({
            q: `mimeType='${FOLDER_MIME_TYPE}' and name='${FOLDER_NAME}' and trashed=false`,
            fields: 'files(id, name)',
        });
        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        }
        return null;
    } catch (error) {
        console.error("Error finding folder:", error);
        throw new Error("Failed to search for the application folder in Google Drive.");
    }
};

/**
 * Creates the application-specific folder in Google Drive.
 * @returns {Promise<string>} The ID of the newly created folder.
 */
const createFolder = async (): Promise<string> => {
    try {
        // @ts-ignore
        const response = await gapi.client.drive.files.create({
            resource: {
                name: FOLDER_NAME,
                mimeType: FOLDER_MIME_TYPE,
            },
            fields: 'id',
        });
        return response.result.id;
    } catch (error) {
        console.error("Error creating folder:", error);
        throw new Error("Failed to create the application folder in Google Drive.");
    }
};

/**
 * Finds the application's data file within a specific folder.
 * @param {string} folderId The ID of the folder to search within.
 * @returns {Promise<string | null>} The file ID or null if not found.
 */
const findFileInFolder = async (folderId: string): Promise<string | null> => {
    try {
        // @ts-ignore
        const response = await gapi.client.drive.files.list({
            q: `'${folderId}' in parents and name='${FILE_NAME}' and trashed=false`,
            fields: 'files(id)',
        });
        if (response.result.files && response.result.files.length > 0) {
            return response.result.files[0].id;
        }
        return null;
    } catch (error) {
        console.error("Error finding file:", error);
        throw new Error("Failed to search for the data file in Google Drive.");
    }
};

/**
 * Saves the application data (config and presets) to Google Drive.
 * It will create the folder and file if they don't exist, or update the existing file.
 * @param {DriveData} data The data object to save.
 */
export const saveDataToDrive = async (data: DriveData): Promise<void> => {
    let folderId = await findFolder();
    if (!folderId) {
        folderId = await createFolder();
    }

    const fileId = await findFileInFolder(folderId);
    const content = JSON.stringify(data, null, 2);
    const blob = new Blob([content], { type: FILE_MIME_TYPE });

    const metadata = {
        name: FILE_NAME,
        mimeType: FILE_MIME_TYPE,
        ...(fileId ? {} : { parents: [folderId] }), // Only specify parent on creation
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const path = fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files';
    const method = fileId ? 'PATCH' : 'POST';

    try {
        // @ts-ignore
        await gapi.client.request({
            path: path,
            method: method,
            params: { uploadType: 'multipart' },
            body: form,
        });
    } catch (error) {
        console.error("Error saving data to Drive:", error);
        throw new Error("An error occurred while saving your data to Google Drive.");
    }
};


/**
 * Loads the application data from Google Drive.
 * @returns {Promise<DriveData | null>} The loaded data or null if not found.
 */
export const loadDataFromDrive = async (): Promise<DriveData | null> => {
    const folderId = await findFolder();
    if (!folderId) {
        return null; // No folder means no file
    }

    const fileId = await findFileInFolder(folderId);
    if (!fileId) {
        return null; // No file to load
    }

    try {
        // @ts-ignore
        const response = await gapi.client.drive.files.get({
            fileId: fileId,
            alt: 'media',
        });
        // The response body is the file content as a string.
        return JSON.parse(response.body) as DriveData;
    } catch (error) {
        console.error("Error loading data from Drive:", error);
        // If parsing fails, it could be an empty or corrupted file.
        throw new Error("Failed to load or parse data from Google Drive.");
    }
};
