import { expect } from 'chai';
import { ethers } from 'hardhat';
import { smock } from '@defi-wonderland/smock';
import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import fetch from 'node-fetch';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import auctionMachineArtifact from '../../artifacts/contracts/AuctionMachine.sol/AuctionMachine.json';
import tokenArtifact from '../../artifacts/contracts/Token.sol/Token.json';
import unorderedTokenArtifact from '../../artifacts/contracts/UnorderedToken.sol/UnorderedToken.json';

async function deployMockContractFromAddress(contractAddress: string, etherscanKey: string) {
    const abi = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${etherscanKey}`)
        .then(response => response.json())
        .then(data => JSON.parse(data['result']));

    return smock.fake(abi, {address: contractAddress});
}

describe('Deployer Workflow Tests', () => {
    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let contractDeployer: any;
    let mockDirectory: any;

    before(async () => {
        [deployer, ...accounts] = await ethers.getSigners();

        mockDirectory = await smock.fake(jbDirectory.abi);

        const mockUniswapQuoter = await deployMockContractFromAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', process.env.ETHERSCAN_KEY || '');
        await mockUniswapQuoter.quoteExactInputSingle.returns('1211000000000000000000');
        await mockUniswapQuoter.quoteExactOutputSingle.returns('1211000000000000000000');

        const auctionMachineFactoryFactory = await ethers.getContractFactory('AuctionMachineFactory', deployer);
        const auctionMachineFactory = await auctionMachineFactoryFactory.connect(deployer).deploy();

        const meowCommonUtilFactory = await ethers.getContractFactory('MeowCommonUtil', deployer);
        const meowCommonUtilLibrary = await meowCommonUtilFactory.connect(deployer).deploy();

        const meowGatewayUtilFactory = await ethers.getContractFactory('MeowGatewayUtil', {
            libraries: { MeowCommonUtil: meowCommonUtilLibrary.address },
            signer: deployer
        });
        const meowGatewayUtilLibrary = await meowGatewayUtilFactory.connect(deployer).deploy();

        const traitsGatewayTokenFactoryFactory = await ethers.getContractFactory('TraitsGatewayTokenFactory', {
            libraries: { MeowGatewayUtil: meowGatewayUtilLibrary.address },
            signer: deployer
        });
        const traitsGatewayTokenFactory = await traitsGatewayTokenFactoryFactory.connect(deployer).deploy();

        const tokenFactoryFactory = await ethers.getContractFactory('TokenFactory', deployer);
        const tokenFactory = await tokenFactoryFactory.connect(deployer).deploy();

        const unorderedTokenFactoryFactory = await ethers.getContractFactory('UnorderedTokenFactory', deployer);
        const unorderedTokenFactory = await unorderedTokenFactoryFactory.connect(deployer).deploy();

        const deployerFactory = await ethers.getContractFactory('Deployer', {
            libraries: {
                AuctionMachineFactory: auctionMachineFactory.address,
                TraitsGatewayTokenFactory: traitsGatewayTokenFactory.address,
                TokenFactory: tokenFactory.address,
                UnorderedTokenFactory: unorderedTokenFactory.address
            },
            signer: deployer
        });
        contractDeployer = await deployerFactory
            .connect(deployer)
            .deploy();
    });

    it('Deploy a Token', async () => {
        const name = 'Token';
        const symbol = 'TKN';
        const baseUri = '';
        const contractUri = '';
        const jbxProjectId = 99;
        const maxSupply = 5;
        const unitPrice = ethers.utils.parseEther('0.0125');
        const mintAllowance = 5;
        const mintPeriodStart = 0;
        const mintPeriodEnd = 0;

        let tx = await contractDeployer.connect(deployer).createToken(
            name,
            symbol,
            baseUri,
            contractUri,
            jbxProjectId,
            mockDirectory.address,
            maxSupply,
            unitPrice,
            mintAllowance,
            mintPeriodStart,
            mintPeriodEnd,
            accounts[0].address
        );
        let result = await tx.wait();
        const tokenAddress = result.events?.filter((f: any) => f.event === 'Deployment')[0]['args']['contractAddress'].toString();

        const tokenContract = new ethers.Contract(tokenAddress, unorderedTokenArtifact.abi, ethers.provider);

        expect(await tokenContract.hasRole('0x0000000000000000000000000000000000000000000000000000000000000000', accounts[0].address)).to.equal(true);
    });

    it('Deploy an UnorderedToken', async () => {
        const name = 'Token';
        const symbol = 'TKN';
        const baseUri = '';
        const contractUri = '';
        const jbxProjectId = 99;
        const maxSupply = 5;
        const unitPrice = ethers.utils.parseEther('0.0125');
        const mintAllowance = 5;
        const mintPeriodStart = 0;
        const mintPeriodEnd = 0;

        let tx = await contractDeployer.connect(deployer).createUnorderedToken(
            name,
            symbol,
            baseUri,
            contractUri,
            jbxProjectId,
            mockDirectory.address,
            maxSupply,
            unitPrice,
            mintAllowance,
            mintPeriodStart,
            mintPeriodEnd,
            accounts[0].address
        );
        let result = await tx.wait();
        const tokenAddress = result.events?.filter((f: any) => f.event === 'Deployment')[0]['args']['contractAddress'].toString();

        const tokenContract = new ethers.Contract(tokenAddress, unorderedTokenArtifact.abi, ethers.provider);

        expect(await tokenContract.hasRole('0x0000000000000000000000000000000000000000000000000000000000000000', accounts[0].address)).to.equal(true);

        tx = await tokenContract.connect(accounts[0]).mintFor(accounts[1].address);
        result = await tx.wait();

        const tokenId =  result.events?.filter((f: any) => f.event === 'Transfer')[0]['args']['id'].toString();
        expect(await tokenContract.ownerOf(tokenId)).to.equal(accounts[1].address);
    });

    it('Deploy an AuctionMachine', async () => {
        const name = 'Token';
        const symbol = 'TKN';
        const baseUri = '';
        const contractUri = '';
        const jbxProjectId = 99;
        const maxSupply = 5;
        const unitPrice = ethers.utils.parseEther('0.0125');
        const mintAllowance = 5;
        const mintPeriodStart = 0;
        const mintPeriodEnd = 0;

        let tx = await contractDeployer.connect(deployer).createToken(
            name,
            symbol,
            baseUri,
            contractUri,
            jbxProjectId,
            mockDirectory.address,
            maxSupply,
            unitPrice,
            mintAllowance,
            mintPeriodStart,
            mintPeriodEnd,
            accounts[0].address
        );
        let result = await tx.wait();
        const tokenAddress = result.events?.filter((f: any) => f.event === 'Deployment')[0]['args']['contractAddress'].toString();

        const tokenContract = new ethers.Contract(tokenAddress, tokenArtifact.abi, ethers.provider);

        expect(await tokenContract.hasRole('0x0000000000000000000000000000000000000000000000000000000000000000', accounts[0].address)).to.equal(true);

        const maxAuctions = 3;
        const auctionDuration = 300;
        tx = await contractDeployer.connect(accounts[0]).createAuctionMachine(
            maxAuctions,
            auctionDuration,
            jbxProjectId,
            mockDirectory.address,
            tokenAddress,
            accounts[1].address);
        result = await tx.wait();
        const auctionMachineAddress = result.events?.filter((f: any) => f.event === 'Deployment')[0]['args']['contractAddress'].toString();

        const auctionMachineContract = new ethers.Contract(auctionMachineAddress, auctionMachineArtifact.abi, ethers.provider);

        expect(await auctionMachineContract.owner()).to.equal(accounts[1].address);
    });
});
