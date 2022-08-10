import { expect } from 'chai';
import fs from 'fs';
import { ethers } from 'hardhat';

import { deployMockContract } from '@ethereum-waffle/mock-contract';

import jbDirectory from '@jbx-protocol/contracts-v2/deployments/mainnet/jbDirectory.json';

describe('MEOWs DAO Token Mint Tests: JBX Delegate', function () {
    const PROJECT_ID = 2;
    const CURRENCY_ETH = 1;
    const ethToken = '0x000000000000000000000000000000000000EEEe'; // JBTokens.ETH

    let projectTerminal: any;
    let beneficiary: any;
    let jbTierRewardToken: any;
    let meowGatewayUtilLibrary: any;

    before(async () => {
        let deployer;
        let accounts;

        [deployer, projectTerminal, beneficiary, ...accounts] = await ethers.getSigners();

        const mockJbDirectory = await deployMockContract(deployer, jbDirectory.abi);

        await mockJbDirectory.mock.isTerminalOf.withArgs(PROJECT_ID, projectTerminal.address).returns(true);
        await mockJbDirectory.mock.isTerminalOf.withArgs(PROJECT_ID, beneficiary.address).returns(false);

        const meowCommonUtilFactory = await ethers.getContractFactory('MeowCommonUtil', deployer);
        const meowCommonUtilLibrary = await meowCommonUtilFactory.connect(deployer).deploy();

        const meowGatewayUtilFactory = await ethers.getContractFactory('MeowGatewayUtil', {
            libraries: { MeowCommonUtil: meowCommonUtilLibrary.address },
            signer: deployer
        });
        meowGatewayUtilLibrary = await meowGatewayUtilFactory.connect(deployer).deploy();

        const jbTierRewardTokenFactory = await ethers.getContractFactory('JBTierRewardToken', {
            libraries: { MeowGatewayUtil: meowGatewayUtilLibrary.address },
            signer: deployer
        });
        jbTierRewardToken = await jbTierRewardTokenFactory
            .connect(deployer)
            .deploy(
                PROJECT_ID,
                mockJbDirectory.address,
                'JBX Delegate Banana',
                'BAJAJA',
                'ipfs://',
                'https://ipfs.io/ipfs/',
                'bafybeifthvccjjxaqlzwvjgvlsgqfygqugww4jdegrltrfrn72mvlrjobu/',
                deployer.address,
                [{
                    contributionFloor: ethers.utils.parseEther('0.00001'),
                    lockedUntil: 0,
                    remainingQuantity: 20,
                    initialQuantity: 20,
                    votingUnits: 10000,
                    reservedRate: 10000,
                    tokenUri: '0x0000000000000000000000000000000000000000000000000000000000000000',
                }, {
                    contributionFloor: ethers.utils.parseEther('1'),
                    lockedUntil: 0,
                    remainingQuantity: 20,
                    initialQuantity: 20,
                    votingUnits: 10000,
                    reservedRate: 10000,
                    tokenUri: '0x0000000000000000000000000000000000000000000000000000000000000000',
                }, {
                    contributionFloor: ethers.utils.parseEther('2'),
                    lockedUntil: 0,
                    remainingQuantity: 10,
                    initialQuantity: 10,
                    votingUnits: 10000,
                    reservedRate: 10000,
                    tokenUri: '0x0000000000000000000000000000000000000000000000000000000000000000',
                }, {
                    contributionFloor: ethers.utils.parseEther('3'),
                    lockedUntil: 0,
                    remainingQuantity: 5,
                    initialQuantity: 5,
                    votingUnits: 10000,
                    reservedRate: 10000,
                    tokenUri: '0x0000000000000000000000000000000000000000000000000000000000000000',
                }, {
                    contributionFloor: ethers.utils.parseEther('4'),
                    lockedUntil: 0,
                    remainingQuantity: 5,
                    initialQuantity: 5,
                    votingUnits: 10000,
                    reservedRate: 10000,
                    tokenUri: '0x0000000000000000000000000000000000000000000000000000000000000000',
                }],
                true,
                deployer.address
            );
    });

    it('Mint token', async () => {
        const baseContribution = ethers.utils.parseEther('0.00001');
        for (let i = 0; i != 6; i++) {
            const contribution = baseContribution.add(ethers.utils.parseEther(`${i}`));

            try {
                const tx = await jbTierRewardToken.connect(projectTerminal).didPay({
                    payer: beneficiary.address,
                    projectId: PROJECT_ID,
                    currentFundingCycleConfiguration: 0,
                    amount: { token: ethToken, value: contribution, decimals: 18, currency: CURRENCY_ETH },
                    projectTokenCount: 0,
                    beneficiary: beneficiary.address,
                    preferClaimedTokens: true,
                    memo: '',
                    metadata: '0x42'
                });
                const receipt = await tx.wait();
                const tokenId = receipt.events?.filter((f: any) => f.event === 'Transfer')[0]['args']['tokenId'].toString();

                expect(await jbTierRewardToken.balanceOf(beneficiary.address)).to.equal(i + 1);

                const traits = await jbTierRewardToken.tokenTraits(tokenId);
                expect(await meowGatewayUtilLibrary.validateTraits(traits)).to.equal(true);

                const tokenUri = await jbTierRewardToken.tokenURI(tokenId);

                let content = tokenUri;
                content = Buffer.from(content.slice(29), 'base64').toString('utf-8');
                // content = JSON.parse(content)['image'];
                // content = Buffer.from(content.slice(26), 'base64').toString('utf-8');
                fs.writeFileSync(`tier-${i + 1}-token.txt`, content);
            } catch (err) {
                console.log(`Mint failed at ${i}`);
                console.log(err);
            }
        }
    });
});

// const blocktime = (await ethers.provider.getBlock('latest')).timestamp + 1;