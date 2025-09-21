import { describe, it, expect, vi, beforeEach } from 'vitest';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Readable } from 'stream';
import { uploadPdf } from './drive';

// Mock dependencies
vi.mock('googleapis', () => ({
	google: {
		drive: vi.fn()
	}
}));

vi.mock('google-auth-library', () => ({
	OAuth2Client: vi.fn()
}));

vi.mock('stream', async (importOriginal) => {
	const actual = await importOriginal() as any;
	return {
		...actual,
		Readable: vi.fn().mockImplementation(() => ({
			_read: vi.fn(),
			push: vi.fn()
		}))
	};
});

vi.mock('$env/static/private', () => ({
	GOOGLE_CLIENT_ID: 'test_client_id',
	GOOGLE_CLIENT_SECRET: 'test_client_secret',
	GOOGLE_REDIRECT_URI: 'http://localhost:5173/auth/callback'
}));

describe('US-5: Google Drive Integration - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('UT-US5-001: Drive Service Initialization', () => {
		it('should initialize Google Drive service with correct credentials', async () => {
			const mockClient = {
				setCredentials: vi.fn()
			};
			const mockDriveService = {
				files: {
					create: vi.fn(),
					list: vi.fn()
				},
				permissions: {
					create: vi.fn()
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(google.drive as any).mockReturnValue(mockDriveService);

			// Mock the file type validation to pass
			const mockFile = {
				type: 'application/pdf',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
			} as any;

			// Mock folder operations
			mockDriveService.files.list
				.mockResolvedValueOnce({ data: { files: [] } }) // .ayvu folder doesn't exist
				.mockResolvedValueOnce({ data: { files: [] } }); // subfolder doesn't exist

			mockDriveService.files.create
				.mockResolvedValueOnce({ data: { id: 'ayvu_folder_id' } }) // Create .ayvu folder
				.mockResolvedValueOnce({ data: { id: 'sub_folder_id' } }) // Create subfolder
				.mockResolvedValueOnce({ 
					data: { 
						id: 'file_id', 
						webViewLink: 'https://drive.google.com/file/d/file_id/view' 
					} 
				}); // Upload file

			mockDriveService.permissions.create.mockResolvedValue({});

			// Mock Readable stream
			const mockStream = {
				_read: vi.fn(),
				push: vi.fn()
			};
			(Readable as any).mockImplementation(() => mockStream);

			await uploadPdf(mockFile, 'test_folder', 'access_token', 'refresh_token');

			// Verify OAuth2Client initialization
			expect(OAuth2Client).toHaveBeenCalledWith(
				'test_client_id',
				'test_client_secret',
				'http://localhost:5173/auth/callback'
			);

			// Verify credentials are set
			expect(mockClient.setCredentials).toHaveBeenCalledWith({
				access_token: 'access_token'
			});

			// Verify Drive service creation
			expect(google.drive).toHaveBeenCalledWith({
				version: 'v3',
				auth: mockClient
			});
		});

		it('should handle authentication errors during service initialization', async () => {
			const mockError = new Error('Authentication failed');
			(OAuth2Client as any).mockImplementation(() => {
				throw mockError;
			});

			const mockFile = {
				type: 'application/pdf'
			} as any;

			await expect(uploadPdf(mockFile, 'test', 'invalid_token', 'invalid_refresh'))
				.rejects
				.toThrow('Authentication failed');
		});
	});

	describe('UT-US5-002: Folder Management', () => {
		it('should find existing .ayvu folder', async () => {
			const mockClient = {
				setCredentials: vi.fn()
			};
			const mockDriveService = {
				files: {
					create: vi.fn(),
					list: vi.fn()
				},
				permissions: {
					create: vi.fn()
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(google.drive as any).mockReturnValue(mockDriveService);

			const mockFile = {
				type: 'application/pdf',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
			} as any;

			// Mock .ayvu folder exists
			mockDriveService.files.list
				.mockResolvedValueOnce({ 
					data: { 
						files: [{ id: 'existing_ayvu_folder_id' }] 
					} 
				}) // .ayvu folder exists
				.mockResolvedValueOnce({ data: { files: [] } }); // subfolder doesn't exist

			mockDriveService.files.create
				.mockResolvedValueOnce({ data: { id: 'sub_folder_id' } }) // Create subfolder
				.mockResolvedValueOnce({ 
					data: { 
						id: 'file_id', 
						webViewLink: 'https://drive.google.com/file/d/file_id/view' 
					} 
				}); // Upload file

			mockDriveService.permissions.create.mockResolvedValue({});

			// Mock Readable stream
			const mockStream = {
				_read: vi.fn(),
				push: vi.fn()
			};
			(Readable as any).mockImplementation(() => mockStream);

			await uploadPdf(mockFile, 'test_folder', 'access_token', 'refresh_token');

			// Verify folder search query for .ayvu folder
			expect(mockDriveService.files.list).toHaveBeenCalledWith({
				q: "name='.ayvu' and mimeType='application/vnd.google-apps.folder' and trashed=false",
				fields: 'files(id)'
			});

			// Verify .ayvu folder was not created since it exists
			expect(mockDriveService.files.create).not.toHaveBeenCalledWith({
				requestBody: {
					name: '.ayvu',
					mimeType: 'application/vnd.google-apps.folder'
				},
				fields: 'id'
			});
		});

		it('should create .ayvu folder when it does not exist', async () => {
			const mockClient = {
				setCredentials: vi.fn()
			};
			const mockDriveService = {
				files: {
					create: vi.fn(),
					list: vi.fn()
				},
				permissions: {
					create: vi.fn()
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(google.drive as any).mockReturnValue(mockDriveService);

			const mockFile = {
				type: 'application/pdf',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
			} as any;

			// Mock folders don't exist
			mockDriveService.files.list
				.mockResolvedValue({ data: { files: [] } });

			mockDriveService.files.create
				.mockResolvedValueOnce({ data: { id: 'new_ayvu_folder_id' } }) // Create .ayvu folder
				.mockResolvedValueOnce({ data: { id: 'sub_folder_id' } }) // Create subfolder
				.mockResolvedValueOnce({ 
					data: { 
						id: 'file_id', 
						webViewLink: 'https://drive.google.com/file/d/file_id/view' 
					} 
				}); // Upload file

			mockDriveService.permissions.create.mockResolvedValue({});

			// Mock Readable stream
			const mockStream = {
				_read: vi.fn(),
				push: vi.fn()
			};
			(Readable as any).mockImplementation(() => mockStream);

			await uploadPdf(mockFile, 'test_folder', 'access_token', 'refresh_token');

			// Verify .ayvu folder creation
			expect(mockDriveService.files.create).toHaveBeenCalledWith({
				requestBody: {
					name: '.ayvu',
					mimeType: 'application/vnd.google-apps.folder'
				},
				fields: 'id'
			});
		});

		it('should create subfolder with parent folder ID', async () => {
			const mockClient = {
				setCredentials: vi.fn()
			};
			const mockDriveService = {
				files: {
					create: vi.fn(),
					list: vi.fn()
				},
				permissions: {
					create: vi.fn()
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(google.drive as any).mockReturnValue(mockDriveService);

			const mockFile = {
				type: 'application/pdf',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
			} as any;

			// Mock .ayvu folder exists, subfolder doesn't
			mockDriveService.files.list
				.mockResolvedValueOnce({ 
					data: { 
						files: [{ id: 'ayvu_folder_id' }] 
					} 
				}) // .ayvu folder exists
				.mockResolvedValueOnce({ data: { files: [] } }); // subfolder doesn't exist

			mockDriveService.files.create
				.mockResolvedValueOnce({ data: { id: 'new_sub_folder_id' } }) // Create subfolder
				.mockResolvedValueOnce({ 
					data: { 
						id: 'file_id', 
						webViewLink: 'https://drive.google.com/file/d/file_id/view' 
					} 
				}); // Upload file

			mockDriveService.permissions.create.mockResolvedValue({});

			// Mock Readable stream
			const mockStream = {
				_read: vi.fn(),
				push: vi.fn()
			};
			(Readable as any).mockImplementation(() => mockStream);

			await uploadPdf(mockFile, 'paper_folder', 'access_token', 'refresh_token');

			// Verify subfolder creation with parent ID
			expect(mockDriveService.files.create).toHaveBeenCalledWith({
				requestBody: {
					name: 'paper_folder',
					mimeType: 'application/vnd.google-apps.folder',
					parents: ['ayvu_folder_id']
				},
				fields: 'id'
			});
		});
	});

	describe('UT-US5-003: File Upload Processing', () => {
		it('should convert file buffer to readable stream', async () => {
			const mockClient = {
				setCredentials: vi.fn()
			};
			const mockDriveService = {
				files: {
					create: vi.fn(),
					list: vi.fn()
				},
				permissions: {
					create: vi.fn()
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(google.drive as any).mockReturnValue(mockDriveService);

			const mockBuffer = new ArrayBuffer(1024);
			const mockFile = {
				type: 'application/pdf',
				arrayBuffer: vi.fn().mockResolvedValue(mockBuffer)
			} as any;

			// Mock folders exist
			mockDriveService.files.list
				.mockResolvedValue({ 
					data: { 
						files: [{ id: 'folder_id' }] 
					} 
				});

			mockDriveService.files.create
				.mockResolvedValueOnce({ 
					data: { 
						id: 'file_id', 
						webViewLink: 'https://drive.google.com/file/d/file_id/view' 
					} 
				}); // Upload file

			mockDriveService.permissions.create.mockResolvedValue({});

			const result = await uploadPdf(mockFile, 'test_folder', 'access_token', 'refresh_token');

			// Verify file buffer was processed
			expect(mockFile.arrayBuffer).toHaveBeenCalled();

			// Verify successful upload
			expect(result).toEqual({
				fileId: 'file_id',
				webViewLink: 'https://drive.google.com/file/d/file_id/view'
			});
		});

		it('should upload file with correct metadata and make it public', async () => {
			const mockClient = {
				setCredentials: vi.fn()
			};
			const mockDriveService = {
				files: {
					create: vi.fn(),
					list: vi.fn()
				},
				permissions: {
					create: vi.fn()
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(google.drive as any).mockReturnValue(mockDriveService);

			const mockFile = {
				type: 'application/pdf',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
			} as any;

			// Mock folders exist
			mockDriveService.files.list
				.mockResolvedValue({ 
					data: { 
						files: [{ id: 'folder_id' }] 
					} 
				});

			const mockUploadResult = {
				data: { 
					id: 'uploaded_file_id', 
					webViewLink: 'https://drive.google.com/file/d/uploaded_file_id/view' 
				}
			};

			mockDriveService.files.create.mockResolvedValue(mockUploadResult);
			mockDriveService.permissions.create.mockResolvedValue({});

			// Mock Readable stream
			const mockStream = {
				_read: vi.fn(),
				push: vi.fn()
			};
			(Readable as any).mockImplementation(() => mockStream);

			const result = await uploadPdf(mockFile, 'research_paper', 'access_token', 'refresh_token');

			// Verify file upload with correct metadata structure
			expect(mockDriveService.files.create).toHaveBeenCalledWith(
				expect.objectContaining({
					requestBody: {
						name: 'research_paper.pdf',
						parents: ['folder_id']
					},
					media: expect.objectContaining({
						mimeType: 'application/pdf',
						body: expect.any(Object) // Accept any stream object
					}),
					fields: 'id, webViewLink'
				})
			);

			// Verify file is made public
			expect(mockDriveService.permissions.create).toHaveBeenCalledWith({
				fileId: 'uploaded_file_id',
				requestBody: {
					role: 'reader',
					type: 'anyone'
				}
			});

			// Verify return value
			expect(result).toEqual({
				fileId: 'uploaded_file_id',
				webViewLink: 'https://drive.google.com/file/d/uploaded_file_id/view'
			});
		});

		it('should validate file type and reject non-PDF files', async () => {
			const invalidFile = {
				type: 'image/jpeg'
			} as any;

			await expect(uploadPdf(invalidFile, 'test', 'token', 'refresh'))
				.rejects
				.toThrow('Invalid file type. Only PDF files are allowed.');
		});

		it('should handle upload errors gracefully', async () => {
			const mockClient = {
				setCredentials: vi.fn()
			};
			const mockDriveService = {
				files: {
					create: vi.fn(),
					list: vi.fn()
				},
				permissions: {
					create: vi.fn()
				}
			};

			(OAuth2Client as any).mockImplementation(() => mockClient);
			(google.drive as any).mockReturnValue(mockDriveService);

			const mockFile = {
				type: 'application/pdf',
				arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
			} as any;

			// Mock folders exist but upload fails
			mockDriveService.files.list
				.mockResolvedValue({ 
					data: { 
						files: [{ id: 'folder_id' }] 
					} 
				});

			const uploadError = new Error('Network error during upload');
			mockDriveService.files.create.mockRejectedValue(uploadError);

			// Mock Readable stream
			const mockStream = {
				_read: vi.fn(),
				push: vi.fn()
			};
			(Readable as any).mockImplementation(() => mockStream);

			await expect(uploadPdf(mockFile, 'test', 'token', 'refresh'))
				.rejects
				.toThrow('Network error during upload');
		});
	});
});
