"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickImage = pickImage;
exports.takePhoto = takePhoto;
exports.pickDocument = pickDocument;
exports.uploadFile = uploadFile;
exports.uploadImageAsset = uploadImageAsset;
exports.attachToMessage = attachToMessage;
exports.attachToDmMessage = attachToDmMessage;
exports.getAttachmentFileUrl = getAttachmentFileUrl;
var ImagePicker = require("expo-image-picker");
var DocumentPicker = require("expo-document-picker");
var expo_file_system_1 = require("expo-file-system");
var LegacyFileSystem = require("expo-file-system/legacy");
var api_1 = require("./api");
var network_config_1 = require("./network-config");
var simulator_harness_1 = require("./simulator-harness");
var RAW_UPLOAD_CONTENT_TYPE = 'application/octet-stream';
var SIMULATOR_TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sM1n8kAAAAASUVORK5CYII=';
function resolveUploadUrl(uploadUrl) {
    return uploadUrl.startsWith('http')
        ? uploadUrl
        : "".concat(network_config_1.API_ORIGIN).concat(uploadUrl);
}
function getMultipartUploadEtag(response) {
    var etag = response.headers.get('etag');
    if (!etag) {
        throw new Error('Multipart upload did not return an ETag');
    }
    return etag;
}
function getMultipartUploadEtagFromHeaders(headers) {
    var etag = headers.etag || headers.ETag;
    if (!etag) {
        throw new Error('Multipart upload did not return an ETag');
    }
    return etag;
}
function sanitizeSimulatorFileName(fileName) {
    return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}
function estimateBase64Size(base64) {
    var paddingMatch = base64.match(/=+$/);
    var padding = paddingMatch ? paddingMatch[0].length : 0;
    return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
function readSimulatorHarnessPickedFile(picker) {
    return __awaiter(this, void 0, void 0, function () {
        var action, fileName, mimeType, base64, targetPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!simulator_harness_1.isSimulatorHarnessEnabled) {
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, (0, simulator_harness_1.readSimulatorHarnessJson)('dev-file-picker-action.json')];
                case 1:
                    action = _a.sent();
                    if (!action || action.picker !== picker) {
                        return [2 /*return*/, null];
                    }
                    fileName = action.fileName
                        || (picker === 'camera'
                            ? "simulator-camera-".concat(Date.now(), ".png")
                            : picker === 'document'
                                ? "simulator-document-".concat(Date.now(), ".pdf")
                                : "simulator-image-".concat(Date.now(), ".png"));
                    mimeType = action.mimeType || guessMimeType(fileName);
                    base64 = action.base64 || SIMULATOR_TINY_PNG_BASE64;
                    targetPath = (0, simulator_harness_1.getSimulatorHarnessPath)("simulator-picked-".concat(Date.now(), "-").concat(sanitizeSimulatorFileName(fileName)));
                    if (!targetPath) {
                        throw new Error('Simulator harness path is not available for the file picker');
                    }
                    return [4 /*yield*/, LegacyFileSystem.writeAsStringAsync(targetPath, base64, {
                            encoding: LegacyFileSystem.EncodingType.Base64,
                        })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, simulator_harness_1.deleteSimulatorHarnessFile)('dev-file-picker-action.json')];
                case 3:
                    _a.sent();
                    return [2 /*return*/, {
                            uri: targetPath,
                            name: fileName,
                            mimeType: mimeType,
                            size: action.size || estimateBase64Size(base64),
                        }];
            }
        });
    });
}
/**
 * Pick an image or video from the device gallery.
 */
function pickImage(options) {
    return __awaiter(this, void 0, void 0, function () {
        var simulatedFile, status, result, asset, fileName, mimeType;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, readSimulatorHarnessPickedFile('image')];
                case 1:
                    simulatedFile = _e.sent();
                    if (simulatedFile) {
                        return [2 /*return*/, simulatedFile];
                    }
                    return [4 /*yield*/, ImagePicker.requestMediaLibraryPermissionsAsync()];
                case 2:
                    status = (_e.sent()).status;
                    if (status !== 'granted') {
                        throw new Error('Camera roll permission is required to select images');
                    }
                    return [4 /*yield*/, ImagePicker.launchImageLibraryAsync({
                            mediaTypes: (options === null || options === void 0 ? void 0 : options.allowsVideo)
                                ? ImagePicker.MediaTypeOptions.All
                                : ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8,
                            allowsMultipleSelection: false,
                        })];
                case 3:
                    result = _e.sent();
                    if (result.canceled || result.assets.length === 0) {
                        return [2 /*return*/, null];
                    }
                    asset = result.assets[0];
                    fileName = (_b = (_a = asset.fileName) !== null && _a !== void 0 ? _a : asset.uri.split('/').pop()) !== null && _b !== void 0 ? _b : 'image.jpg';
                    mimeType = (_c = asset.mimeType) !== null && _c !== void 0 ? _c : guessMimeType(fileName);
                    return [2 /*return*/, {
                            uri: asset.uri,
                            name: fileName,
                            mimeType: mimeType,
                            size: (_d = asset.fileSize) !== null && _d !== void 0 ? _d : 0,
                        }];
            }
        });
    });
}
/**
 * Take a photo with the camera.
 */
function takePhoto() {
    return __awaiter(this, void 0, void 0, function () {
        var simulatedFile, status, result, asset, fileName, mimeType;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, readSimulatorHarnessPickedFile('camera')];
                case 1:
                    simulatedFile = _d.sent();
                    if (simulatedFile) {
                        return [2 /*return*/, simulatedFile];
                    }
                    return [4 /*yield*/, ImagePicker.requestCameraPermissionsAsync()];
                case 2:
                    status = (_d.sent()).status;
                    if (status !== 'granted') {
                        throw new Error('Camera permission is required to take photos');
                    }
                    return [4 /*yield*/, ImagePicker.launchCameraAsync({
                            quality: 0.8,
                            allowsEditing: false,
                        })];
                case 3:
                    result = _d.sent();
                    if (result.canceled || result.assets.length === 0) {
                        return [2 /*return*/, null];
                    }
                    asset = result.assets[0];
                    fileName = (_a = asset.fileName) !== null && _a !== void 0 ? _a : "photo_".concat(Date.now(), ".jpg");
                    mimeType = (_b = asset.mimeType) !== null && _b !== void 0 ? _b : 'image/jpeg';
                    return [2 /*return*/, {
                            uri: asset.uri,
                            name: fileName,
                            mimeType: mimeType,
                            size: (_c = asset.fileSize) !== null && _c !== void 0 ? _c : 0,
                        }];
            }
        });
    });
}
/**
 * Pick a document/file of any type.
 */
function pickDocument() {
    return __awaiter(this, void 0, void 0, function () {
        var simulatedFile, result, asset;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, readSimulatorHarnessPickedFile('document')];
                case 1:
                    simulatedFile = _c.sent();
                    if (simulatedFile) {
                        return [2 /*return*/, simulatedFile];
                    }
                    return [4 /*yield*/, DocumentPicker.getDocumentAsync({
                        type: '*/*',
                        copyToCacheDirectory: true,
                    })];
                case 2:
                    result = _c.sent();
                    if (result.canceled || result.assets.length === 0) {
                        return [2 /*return*/, null];
                    }
                    asset = result.assets[0];
                    return [2 /*return*/, {
                            uri: asset.uri,
                            name: asset.name,
                            mimeType: (_a = asset.mimeType) !== null && _a !== void 0 ? _a : guessMimeType(asset.name),
                            size: (_b = asset.size) !== null && _b !== void 0 ? _b : 0,
                        }];
            }
        });
    });
}
function uploadSinglePartFile(file, uploadUrl, onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var uploadTask, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    uploadTask = LegacyFileSystem.createUploadTask(uploadUrl, file.uri, {
                        httpMethod: 'PUT',
                        uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
                        headers: {
                            'Content-Type': file.mimeType || RAW_UPLOAD_CONTENT_TYPE,
                        },
                    }, function (progressEvent) {
                        if (!onProgress || !progressEvent.totalBytesExpectedToSend) {
                            return;
                        }
                        onProgress(progressEvent.totalBytesSent / progressEvent.totalBytesExpectedToSend);
                    });
                    return [4 /*yield*/, uploadTask.uploadAsync()];
                case 1:
                    result = _a.sent();
                    if (!result) {
                        throw new Error('Upload failed');
                    }
                    if (result.status === 429) {
                        throw new api_1.ApiError(429, 'Too many requests', 'RATE_LIMITED');
                    }
                    if (result.status < 200 || result.status >= 300) {
                        throw new Error("Upload failed with status ".concat(result.status));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
async function uploadMultipartFile(file, presign, onProgress) {
    if (!presign.partSize || !presign.partCount || presign.partCount < 1) {
        throw new Error('Multipart upload is missing part metadata');
    }
    var _a = await (0, api_1.api)("/api/upload/sessions/".concat(presign.uploadSessionId, "/parts"), {
        method: 'POST',
        body: {
            partNumbers: Array.from({ length: presign.partCount }, function (_, index) { return index + 1; }),
        },
    }), parts = _a.parts;
    var nativeFile = new expo_file_system_1.File(file.uri);
    var completedParts = [];
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        var start = (part.partNumber - 1) * presign.partSize;
        var end = Math.min(start + presign.partSize, file.size);
        var chunkFile = nativeFile.slice(start, end, file.mimeType || RAW_UPLOAD_CONTENT_TYPE);
        var chunkBase64 = await chunkFile.base64();
        var chunkUri = "".concat(LegacyFileSystem.cacheDirectory, "multipart-").concat(presign.uploadSessionId, "-").concat(part.partNumber);
        await LegacyFileSystem.writeAsStringAsync(chunkUri, chunkBase64, {
            encoding: LegacyFileSystem.EncodingType.Base64,
        });
        var uploadResult = void 0;
        try {
            uploadResult = await LegacyFileSystem.uploadAsync(resolveUploadUrl(part.uploadUrl), chunkUri, {
                httpMethod: 'PUT',
                uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
                headers: {
                    'Content-Type': file.mimeType || RAW_UPLOAD_CONTENT_TYPE,
                },
            });
        }
        finally {
            await LegacyFileSystem.deleteAsync(chunkUri, { idempotent: true }).catch(function () { return undefined; });
        }
        if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error("Upload failed with status ".concat(uploadResult.status));
        }
        completedParts.push({
            partNumber: part.partNumber,
            etag: getMultipartUploadEtagFromHeaders(uploadResult.headers),
        });
        if (onProgress) {
            onProgress(part.partNumber / presign.partCount);
        }
    }
    await (0, api_1.api)("/api/upload/sessions/".concat(presign.uploadSessionId, "/complete"), {
        method: 'POST',
        body: {
            parts: completedParts,
        },
    });
}
/**
 * Upload a picked file using the presign flow.
 * 1. Get a presigned upload URL from the server
 * 2. Upload the file directly to the storage (S3/MinIO)
 * 3. Return the storage key for attaching to a message
 */
function uploadFile(file, target, onProgress) {
    return __awaiter(this, void 0, void 0, function () {
        var presign, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, api_1.api)('/api/upload/presign', {
                        method: 'POST',
                        body: __assign(__assign({}, target), { fileName: file.name, mimeType: file.mimeType, fileSize: file.size }),
                    })];
                case 1:
                    presign = _a.sent();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 8, , 12]);
                    if (!(presign.uploadMode === 'multipart')) return [3 /*break*/, 4];
                    return [4 /*yield*/, uploadMultipartFile(file, presign, onProgress)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 7];
                case 4: return [4 /*yield*/, uploadSinglePartFile(file, resolveUploadUrl(presign.uploadUrl), onProgress)];
                case 5:
                    _a.sent();
                    return [4 /*yield*/, (0, api_1.api)("/api/upload/sessions/".concat(presign.uploadSessionId, "/complete"), {
                            method: 'POST',
                            body: {
                                parts: [{ partNumber: 1, etag: 'single-part' }],
                            },
                        })];
                case 6:
                    _a.sent();
                    _a.label = 7;
                case 7: return [3 /*break*/, 12];
                case 8:
                    error_1 = _a.sent();
                    _a.label = 9;
                case 9:
                    _a.trys.push([9, 11, , 12]);
                    return [4 /*yield*/, (0, api_1.api)("/api/upload/sessions/".concat(presign.uploadSessionId, "/abort"), {
                            method: 'POST',
                        })];
                case 10:
                    _a.sent();
                    return [3 /*break*/, 12];
                case 11:
                    _a.sent();
                    return [3 /*break*/, 12];
                case 12:
                    if (error_1) {
                        throw error_1;
                    }
                    return [2 /*return*/, {
                            uploadSessionId: presign.uploadSessionId,
                            storageKey: presign.storageKey,
                            fileName: file.name,
                            mimeType: file.mimeType,
                            fileSize: file.size,
                        }];
            }
        });
    });
}
function uploadImageAsset(file, scope, communityId) {
    return __awaiter(this, void 0, void 0, function () {
        var presign, uploadUrl, uploadResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, api_1.api)('/api/upload/assets/presign', {
                        method: 'POST',
                        body: {
                            scope: scope,
                            communityId: communityId,
                            fileName: file.name,
                            mimeType: file.mimeType,
                            fileSize: file.size,
                        },
                    })];
                case 1:
                    presign = _a.sent();
                    uploadUrl = presign.uploadUrl.startsWith('http')
                        ? presign.uploadUrl
                        : "".concat(network_config_1.API_ORIGIN).concat(presign.uploadUrl);
                    return [4 /*yield*/, LegacyFileSystem.uploadAsync(uploadUrl, file.uri, {
                            httpMethod: 'PUT',
                            uploadType: LegacyFileSystem.FileSystemUploadType.BINARY_CONTENT,
                            headers: {
                                'Content-Type': file.mimeType,
                            },
                        })];
                case 2:
                    uploadResult = _a.sent();
                    if (uploadResult.status === 429) {
                        throw new api_1.ApiError(429, 'Too many requests', 'RATE_LIMITED');
                    }
                    if (uploadResult.status < 200 || uploadResult.status >= 300) {
                        throw new Error("Upload failed with status ".concat(uploadResult.status));
                    }
                    return [2 /*return*/, presign.assetUrl.startsWith('http')
                            ? presign.assetUrl
                            : "".concat(network_config_1.API_ORIGIN).concat(presign.assetUrl)];
            }
        });
    });
}
/**
 * Register an uploaded attachment with a message.
 */
function attachToMessage(messageId, attachment) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, api_1.api)('/api/upload/attachments', {
                        method: 'POST',
                        body: __assign({ messageId: messageId }, attachment),
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function attachToDmMessage(dmMessageId, attachment) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, api_1.api)('/api/upload/attachments', {
                        method: 'POST',
                        body: __assign({ dmMessageId: dmMessageId }, attachment),
                    })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getAttachmentFileUrl(attachmentId) {
    return "".concat(network_config_1.API_ORIGIN, "/api/upload/attachments/").concat(attachmentId, "/file");
}
// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function guessMimeType(fileName) {
    var _a, _b;
    var ext = (_a = fileName.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
    var mimeMap = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        heic: 'image/heic',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        txt: 'text/plain',
        md: 'text/markdown',
        csv: 'text/csv',
        json: 'application/json',
        pdf: 'application/pdf',
        dmg: 'application/x-apple-diskimage',
        iso: 'application/x-iso9660-image',
        pkg: 'application/vnd.apple.installer+xml',
        tar: 'application/x-tar',
        gz: 'application/gzip',
        tgz: 'application/gzip',
        bz2: 'application/x-bzip2',
        xz: 'application/x-xz',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        xls: 'application/vnd.ms-excel',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ppt: 'application/vnd.ms-powerpoint',
        pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        zip: 'application/zip',
        rar: 'application/vnd.rar',
        '7z': 'application/x-7z-compressed',
        exe: 'application/vnd.microsoft.portable-executable',
        msi: 'application/x-msi',
        apk: 'application/vnd.android.package-archive',
    };
    return (_b = mimeMap[ext !== null && ext !== void 0 ? ext : '']) !== null && _b !== void 0 ? _b : 'application/octet-stream';
}
