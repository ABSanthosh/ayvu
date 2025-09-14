import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '$env/static/private';
import { Readable } from 'stream';

interface GoogleDriveService {
	files: {
		create: Function;
		list: Function;
	};
	permissions: {
		create: Function;
	};
}

interface UploadResult {
	fileId: string;
	webViewLink: string;
}

// Initialize Google Drive service
const initializeDriveService = async (
	refresh_token: string,
	access_token: string
): Promise<GoogleDriveService> => {
	const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
	client.setCredentials({
		access_token,
		// refresh_token
	})
  // client.getAccessToken()
	return google.drive({ version: 'v3', auth: client });
};

// Check if a folder exists and return its ID if found
const findFolder = async (
	service: GoogleDriveService,
	folderName: string,
	parentId?: string
): Promise<string | null> => {
	try {
		let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
		if (parentId) {
			query += ` and '${parentId}' in parents`;
		}

		const response = await service.files.list({
			q: query,
			fields: 'files(id)'
		});

		const files = response.data.files;
		if (files && files.length > 0) {
			return files[0].id;
		}
		return null;
	} catch (error) {
		console.error(`Error finding folder ${folderName}:`, error);
		throw error;
	}
};

// Create a new folder and return its ID
const createFolder = async (
	service: GoogleDriveService,
	folderName: string,
	parentId?: string
): Promise<string> => {
	try {
		const folderMetadata: any = {
			name: folderName,
			mimeType: 'application/vnd.google-apps.folder'
		};

		if (parentId) {
			folderMetadata.parents = [parentId];
		}

		const folder = await service.files.create({
			requestBody: folderMetadata,
			fields: 'id'
		});

		return folder.data.id;
	} catch (error) {
		console.error(`Error creating folder ${folderName}:`, error);
		throw error;
	}
};

// Find or create folder, handling parent folders if needed
const ensureFolder = async (
	service: GoogleDriveService,
	folderName: string,
	parentId?: string
): Promise<string> => {
	let folderId = await findFolder(service, folderName, parentId);
	if (!folderId) {
		folderId = await createFolder(service, folderName, parentId);
	}
	return folderId;
};

// Make file publicly accessible
const makeFilePublic = async (service: GoogleDriveService, fileId: string): Promise<void> => {
	try {
		await service.permissions.create({
			fileId: fileId,
			requestBody: {
				role: 'reader',
				type: 'anyone'
			}
		});
	} catch (error) {
		console.error('Error setting file permissions:', error);
		throw error;
	}
};

// Convert ArrayBuffer to Readable Stream
const bufferToStream = (buffer: ArrayBuffer): Readable => {
	const readable = new Readable();
	readable._read = () => {}; // _read is required but you can noop it
	readable.push(Buffer.from(buffer));
	readable.push(null);
	return readable;
};

// Upload file to specified folder with custom name
const uploadFileToFolder = async (
	service: GoogleDriveService,
	file: File,
	fileName: string,
	folderId: string
): Promise<UploadResult> => {
	try {
		const fileMetadata = {
			name: fileName,
			parents: [folderId]
		};

		// Convert File object to readable stream
		const arrayBuffer = await file.arrayBuffer();
		const stream = bufferToStream(arrayBuffer);

		const media = {
			mimeType: file.type,
			body: stream
		};

		const uploadedFile = await service.files.create({
			requestBody: fileMetadata,
			media: media,
			fields: 'id, webViewLink'
		});

		// Make the file public
		await makeFilePublic(service, uploadedFile.data.id);

		return {
			fileId: uploadedFile.data.id,
			webViewLink: uploadedFile.data.webViewLink
		};
	} catch (error) {
		console.error('Error uploading file:', error);
		throw error;
	}
};

// Main upload function
export const uploadPdf = async (
	file: File,
	folderName: string,
	access_token: string,
	refresh_token: string
): Promise<UploadResult> => {
	// Validate file type
	if (!file.type.includes('pdf')) {
		throw new Error('Invalid file type. Only PDF files are allowed.');
	}

	try {
		// Initialize service
		const service = await initializeDriveService(refresh_token, access_token);

		// Ensure .ayvu folder exists
		const ayvuFolderId = await ensureFolder(service, '.ayvu');

		// Create subfolder with the specified name inside .ayvu
		const subFolderId = await ensureFolder(service, folderName, ayvuFolderId);

		// Upload file with the new name to the subfolder
		const newFileName = `${folderName}.pdf`;
		const fileId = await uploadFileToFolder(service, file, newFileName, subFolderId);

		return fileId;
	} catch (error) {
		console.error('Error in uploadPdf:', error);
		throw error;
	}
};
