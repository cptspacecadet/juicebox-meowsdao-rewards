import * as dotenv from "dotenv";
import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';

dotenv.config();

async function main() {
    const [deployer] = await ethers.getSigners();

    const tokenName = 'Token';
    const tokenSymbol = 'TKN';
    const tokenBaseUri = 'ipfs://hidden'; // pre-reveal URI; call setBaseURI(string memory _baseUri, bool _reveal) to update and reveal
    const tokenContractUri = 'ipfs://metadata';
    const jbxProjectId = 99; // Juicebox project to pay proceeds to; WARNING: CANNOT be changed later.
    const jbxDirectoryAddress = '0x8E05bcD2812E1449f0EC3aE24E2C395F533d9A99'; // mainnet: 0x65572FB928b46f9aDB7cfe5A4c41226F636161ea; goerli: JBDirectory: 0x8E05bcD2812E1449f0EC3aE24E2C395F533d9A99; reference: https://info.juicebox.money/dev/resources/addresses/#juicebox-protocol-v3
    const tokenMaxSupply = 10_000; // Total supply
    const tokenMintAllowance = 5; // per-account mint allowane
    const mintPeriodStart = 0;
    const mintPeriodEnd = 0;
    const tokenUnitPrice = ethers.utils.parseEther('0.0125');

    console.log(`attempting to deploy new NFT for ${deployer.address}`);

    const tokenFactory = await ethers.getContractFactory('Token', deployer);
    const token = await tokenFactory
      .connect(deployer)
      .deploy(
        tokenName,
        tokenSymbol,
        tokenBaseUri,
        tokenContractUri,
        jbxProjectId,
        jbxDirectoryAddress,
        tokenMaxSupply,
        tokenUnitPrice,
        tokenMintAllowance,
        mintPeriodStart,
        mintPeriodEnd,
      );

    await token.deployed();
    console.log(`deployed new NFT contract for ${deployer.address} at ${token.address} in transaction ${token.deployTransaction.hash}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

// npx hardhat run scripts/deploySimpleToken.ts --network goerli
