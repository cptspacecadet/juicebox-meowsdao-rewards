import { expect } from 'chai';
import { ethers } from 'hardhat';
import fetch from 'node-fetch';

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { smock } from '@defi-wonderland/smock';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';
import jbETHPaymentTerminal from '@jbx-protocol/contracts-v2/deployments/mainnet/jbETHPaymentTerminal.json';

import * as MerkleHelper from '../components/MerkleHelper';

async function deployMockContractFromAddress(contractAddress: string, etherscanKey: string) {
    const abi = await fetch(`https://api.etherscan.io/api?module=contract&action=getabi&address=${contractAddress}&apikey=${etherscanKey}`)
        .then(response => response.json())
        .then(data => JSON.parse(data['result']));

    return smock.fake(abi, {address: contractAddress});
}

describe('MEOWs DAO Token Mint Tests: Merkle Tree', () => {
    const tokenUnitPrice = ethers.utils.parseEther('0.0125');
    const jbxProjectId = 99;
    const jbxJbTokensEth = '0x000000000000000000000000000000000000EEEe';

    let deployer: SignerWithAddress;
    let accounts: SignerWithAddress[];
    let token: any;
    let merkleSnapshot: { [key: string]: number };
    let merkleData: any;
    let mockDirectory: any;
    let ethTerminal: any;

    before(async () => {
        const tokenName = 'Token';
        const tokenSymbol = 'TKN';
        const tokenBaseUri = 'ipfs://hidden';
        const tokenContractUri = 'ipfs://metadata';
        const jbxProjectId = 99;
        const tokenMaxSupply = 8;
        const tokenMintAllowance = 6;
        const mintPeriodStart = 0;
        const mintPeriodEnd = 0;

        [deployer, ...accounts] = await ethers.getSigners();

        const mockUniswapQuoter = await deployMockContractFromAddress('0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', process.env.ETHERSCAN_KEY || '');
        await mockUniswapQuoter.quoteExactInputSingle.returns('1211000000000000000000');

        const mockUniswapRouter = await deployMockContractFromAddress('0xE592427A0AEce92De3Edee1F18E0157C05861564', process.env.ETHERSCAN_KEY || '');

        ethTerminal = await smock.fake(jbETHPaymentTerminal.abi);
        await ethTerminal.pay.returns(0);

        mockDirectory = await smock.fake(jbDirectory.abi);
        await mockDirectory.isTerminalOf.whenCalledWith(jbxProjectId, ethTerminal.address).returns(true);
        await mockDirectory.primaryTerminalOf.whenCalledWith(jbxProjectId, jbxJbTokensEth).returns(ethTerminal.address);

        const tokenFactory = await ethers.getContractFactory('UnorderedToken', deployer);
        token = await tokenFactory.connect(deployer).deploy(
            tokenName,
            tokenSymbol,
            tokenBaseUri,
            tokenContractUri,
            jbxProjectId,
            mockDirectory.address,
            tokenMaxSupply,
            tokenUnitPrice,
            tokenMintAllowance,
            mintPeriodStart,
            mintPeriodEnd
        );
    });

    before(async () => {
        merkleSnapshot = MerkleHelper.makeSampleSnapshot(accounts.slice(1).map(a => a.address));
        merkleData = MerkleHelper.buildMerkleTree(merkleSnapshot);

        await token.connect(deployer).setMerkleRoot(merkleData.merkleRoot);
    });

    it('User mints', async () => {
        const merkleItem = merkleData.claims[accounts[1].address];
        await expect(token.connect(accounts[1]).merkleMint(merkleItem.index, merkleItem.data, merkleItem.proof))
            .to.emit(token, 'Transfer');
    });

    it('User mints: failure, invalid proof', async () => {
        const merkleItem = merkleData.claims[accounts[1].address];
        await expect(token.connect(accounts[0]).merkleMint(merkleItem.index, merkleItem.data, merkleItem.proof))
            .to.be.revertedWith('INVALID_PROOF()');
    });

    it('User mints first: failure, invalid proof', async () => {
        const merkleItem = merkleData.claims[accounts[1].address];
        await expect(token.connect(accounts[0]).merkleMint(merkleItem.index, merkleItem.data, merkleItem.proof))
            .to.be.revertedWith('INVALID_PROOF()');
    });

    it('User mints first: failure, claims exhausted', async () => {
        const merkleItem = merkleData.claims[accounts[2].address];

        for (let i = 0; i < Number(merkleItem.data); i++) {
            await token.connect(accounts[2]).merkleMint(merkleItem.index, merkleItem.data, merkleItem.proof);
        }

        await expect(token.connect(accounts[2]).merkleMint(merkleItem.index, merkleItem.data, merkleItem.proof))
            .to.be.revertedWith('CLAIMS_EXHAUSTED()');
    });

    it('User mints: payment failure', async () => {
        await mockDirectory.isTerminalOf.whenCalledWith(jbxProjectId, ethTerminal.address).returns(false);
        await mockDirectory.primaryTerminalOf.whenCalledWith(jbxProjectId, jbxJbTokensEth).returns(ethers.constants.AddressZero);
        await token.connect(accounts[3])['mint()']({value: 0});

        await expect(token.connect(accounts[3])['mint()']({value: tokenUnitPrice}))
            .to.be.revertedWith('PAYMENT_FAILURE()');
    });
});
