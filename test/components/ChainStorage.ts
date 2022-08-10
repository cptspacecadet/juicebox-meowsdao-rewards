import fs from 'fs';
import * as path from 'path';
import { ethers } from 'hardhat';
import pako from 'pako';
import uuid4 from 'uuid4';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

const CHUNK_SIZE = Math.floor((1024 * 8) / 32); // 24KB, max size of Ethereum contract

export async function loadFile(storage: any, deployer: SignerWithAddress, pathInfo: string[], id: string): Promise<BigNumber> {
    const fileData = path.resolve(__dirname, ...pathInfo);
    return await loadAsset(storage, deployer, fileData, id);
}

export async function loadLayers(storage: any, deployer: SignerWithAddress, source: string, offsetMap: { [key: string]: number }): Promise<BigNumber> {
    const layers = JSON.parse(fs.readFileSync(path.join(source, 'assetIndex.json')).toString());

    let gas = BigNumber.from(0);

    for (const group of Object.keys(layers)) {
        for (let i = 0; i < layers[group].length; i++) {
            const item = layers[group][i];
            if (item === 'Nothing') {
                continue;
            }

            const asset = path.resolve(__dirname, '..', '..', source, group, `${item}`);
            const id = BigNumber.from(i + 1).shl(offsetMap[group]).toString(); // NOTE: without this all 0-index file will collide

            try {
                const incrementalGas = await loadAsset(storage, deployer, asset, id.toString());
                gas = gas.add(incrementalGas);
            } catch (err) {
                console.log(`failed to store ${asset} as ${id.toString()}`);
                console.log(err);
            }
        }
    }

    return gas;
}

/**
 *
 * @param storage Storage contract.
 * @param signer Account with permissions to add assets.
 * @param asset Fully qualified path of the file to load.
 * @param assetId Asset id to store the file as. WARNING: no validation, duplicates will fail, limit 64bit uint.
 */
export async function loadAsset(
    storage: any,
    signer: SignerWithAddress,
    asset: string,
    assetId: string,
): Promise<BigNumber> {
    let assetParts: any;
    let inflatedSize = 0;

    if (asset.endsWith('svg')) {
        assetParts = chunkDeflate(asset);
        inflatedSize = assetParts.inflatedSize;
    } else {
        assetParts = chunkAsset(asset);
        inflatedSize = assetParts.length;
    }

    let sliceKey = '0x' + Buffer.from(uuid4(), 'utf-8').toString('hex').slice(-64);
    let tx: TransactionResponse = await storage
        .connect(signer)
        .createAsset(assetId, sliceKey, assetParts.parts[0], assetParts.length, { gasLimit: 5_000_000 });
    const receipt = await tx.wait();
    let gas = BigNumber.from(receipt.gasUsed);

    for (let i = 1; i < assetParts.parts.length; i++) {
        sliceKey = '0x' + Buffer.from(uuid4(), 'utf-8').toString('hex').slice(-64);
        tx = await storage
            .connect(signer)
            .appendAssetContent(assetId, sliceKey, assetParts.parts[i], { gasLimit: 5_000_000 });
        const receipt = await tx.wait();
        gas = gas.add(receipt.gasUsed);
    }

    // if (inflatedSize != assetParts.length) {
    //     tx = await storage.connect(signer).setAssetAttribute(0, '_inflatedSize', AssetAttrType.UINT_VALUE, [smallIntToBytes32(inflatedSize)]);
    //     await tx.wait();
    //     console.log(`added ${asset}, compressed ${assetParts.inflatedSize} to ${assetParts.length} as ${assetId}`);
    // } else {
    //     console.log(`added ${asset}, ${assetParts.length} as ${assetId}/${Number(assetId).toString(16)}`);
    // }

    return gas;
}

function chunkDeflate(filePath: string): { length: number, parts: string[][], inflatedSize: number } {
    const buffer = fs.readFileSync(path.resolve(__dirname, '..', filePath));
    const compressed = pako.deflateRaw(buffer, { level: 9 });

    return { ...chunkBuffer(Buffer.from(compressed)), inflatedSize: buffer.length };
}

function chunkAsset(filePath: string): { length: number, parts: string[][] } {
    const buffer = fs.readFileSync(path.resolve(__dirname, '..', filePath));

    return chunkBuffer(buffer);
}

function chunkBuffer(buffer: Buffer) {
    const arrayBuffer32 = bufferTo32ArrayBuffer(buffer);

    const parts: string[][] = [];
    for (let i = 0; i < arrayBuffer32.length; i += CHUNK_SIZE) {
        parts.push(arrayBuffer32.slice(i, i + CHUNK_SIZE));
    }

    return { length: buffer.length, parts };
}

export function deserializeString(bytes: string[]) {
    let buffer = Buffer.from('');

    for (const part of bytes) {
        buffer = Buffer.concat([buffer, Buffer.from(part.slice(2), 'hex')]);
    }

    return buffer.toString('utf8').replace(/\0/g, '');
}

export function smallIntToBytes32(value: number): string {
    return '0x' + ('0000000000000000000000000000000000000000000000000000000000000000' + (value).toString(16)).slice(-64);
}

export function bufferToArrayBuffer(buffer: Buffer) {
    return Array.from(buffer);
}

/**
 * @param Buffer buffer
 * @returns string[] hexStringArray
 */
export function bufferTo32ArrayBuffer(buffer: Buffer) {
    const arrayBuffer = Array.from(buffer);
    const uint256ArrayBuffer: string[] = [];

    for (let i = 0; i < arrayBuffer.length; i++) {
        if (uint256ArrayBuffer.length === 0 || uint256ArrayBuffer[uint256ArrayBuffer.length - 1].length >= 64) uint256ArrayBuffer.push('');
        uint256ArrayBuffer[uint256ArrayBuffer.length - 1] += (arrayBuffer[i] || 0).toString(16).padStart(2, '0');
    }

    for (let i = 0; i < uint256ArrayBuffer.length; i++) {
        uint256ArrayBuffer[i] = '0x' + uint256ArrayBuffer[i].padEnd(64, '0');
    }
    return uint256ArrayBuffer;
}