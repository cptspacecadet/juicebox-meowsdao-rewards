import * as dotenv from "dotenv";
import { BigNumber } from 'ethers';
import fs from 'fs';
import { NFTStorage, File } from 'nft.storage';
import path from 'path';

import * as AssetUtils from '../test/components/AssetUtils';

dotenv.config();

/**
 * Lists png files in a given location recursively.
 * 
 * @param location 
 * @param extension Defaults to '.png', frequently also '.svg'
 */
async function listAssets(location: string, extension = '.png') {
    const traits = AssetUtils.listAssets(location, extension);

    console.log(JSON.stringify(traits));
}

/**
 * Expects to find an assetIndex.json file at the source containing assets to be processed with full names and in the correct order.
 * 
 * @param source 
 * @param destination 
 */
async function renameAssets(source: string, destination: string) {
    AssetUtils.renameAssets(source, destination);
}

async function uploadAssets(source: string, deleteAfterUpload = true) {
    const fileNames: string[] = fs.readdirSync(source);
    const fileContent: File[] = [];

    for (const name of fileNames) {
        fileContent.push(new File([fs.readFileSync(path.resolve(source, name))], name));
    }

    const storage = new NFTStorage({ endpoint: new URL('https://api.nft.storage'), token: process.env.NFT_STORAGE_API_KEY || '' });

    try {
        const cid = await storage.storeDirectory(fileContent);

        console.log({ cid });
        const status = await storage.status(cid);
        console.log(status);
    } catch (error) {
        console.log(error)
    }

    if (deleteAfterUpload) {
        fs.rmdirSync(source);
    }
}

async function main() {
    // const args = process.argv.slice(2);

    // if (args.length == 0) {
    //     printUsage();
    // } else if (args[0] === 'list') {
    //     listAssets('assets');
    // } else if (args[0] === 'rename') {
    //     renameAssets('assets', 'scratch');
    // } else if (args[0] === 'upload') {
    //     uploadAssets('scratch', false);
    // } else {
    //     printUsage();
    // }
}

function printUsage() {
    console.log('available commands: list, rename, upload');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
