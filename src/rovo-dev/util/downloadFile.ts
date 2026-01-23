import AdmZip from 'adm-zip';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 } from 'uuid';
import { Uri } from 'vscode';

import { getFsPromise } from './fsPromises';

export async function downloadAndUnzip(
    url: Uri | string,
    downloadPath: string,
    extractPath: string,
    deleteZipAfterExtraction?: boolean,
    onProgress?: (downloaded: number, total: number) => void,
) {
    const urlString = typeof url === 'string' ? url : url.toString();
    const downloadFilePath = path.join(downloadPath, v4());

    const response = await axios({
        url: urlString,
        method: 'GET',
        responseType: 'stream',
    });

    const totalLength = parseInt(response.headers['content-length'] || '0', 10);
    let downloaded = 0;

    if (!fs.existsSync(downloadPath)) {
        await getFsPromise((callback) => fs.mkdir(downloadPath, { recursive: true }, callback));
    }

    const writer = fs.createWriteStream(downloadFilePath);
    response.data.on('data', (chunk: Buffer) => {
        downloaded += chunk.length;
        if (onProgress) {
            onProgress(downloaded, totalLength);
        }
    });
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    const zip = new AdmZip(downloadFilePath);
    await extractAllToPromise(zip, extractPath, /*overwrite*/ true, true);

    if (deleteZipAfterExtraction) {
        await getFsPromise((callback) => fs.rm(downloadFilePath, callback));
    }
}

function extractAllToPromise(zip: AdmZip, targetPath: string, overwrite?: boolean, keepOriginalPermission?: boolean) {
    return new Promise<void>((resolve, reject) => {
        zip.extractAllToAsync(targetPath, overwrite, keepOriginalPermission, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve();
            }
        });
    });
}
