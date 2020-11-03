const { ethers } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");
const kyber = require("@studydefi/money-legos/kyber");

const privKey = "0x<your private key>";
const provider = new ethers.providers.JsonRpcProvider(
    process.env.PROVIDER_URL || "https://mainnet.infura.io/v3/<Infura endpoint>",
);
const wallet = new ethers.Wallet(privKey, provider);

const swapOnKyber = async (fromAddress, toAddress, fromAmountWei) => {
    // Don't swap
    if (fromAddress === toAddress) {
        return fromAmountWei;
    }

    const gasLimit = 4000000; // depends on your gasLimit

    // Min conversion rate
    const minConversionRate = 1;

    // refer to 
    // https://github.com/studydefi/money-legos/blob/master/src/kyber/contracts.ts
    const kyberNetwork = new ethers.Contract(
        kyber.network.address,
        kyber.network.abi,
        wallet,
    );

    // ERC20 contract
    const fromTokenContract = new ethers.Contract(fromAddress, erc20.abi, wallet);

    // ETH -> Token
    if (fromAddress === erc20.eth.address) {
        return kyberNetwork.swapEtherToToken(toAddress, minConversionRate, {
          gasLimit,
          value: fromAmountWei,
        });
    }

    // Need to approve transferFrom
    await fromTokenContract.approve(kyberNetwork.address, fromAmountWei);

    // Token -> ETH
    if (toAddress === erc20.eth.address) {
        return kyberNetwork.swapTokenToEther(
            fromAddress,
            fromAmountWei,
            minConversionRate,
            {
                gasLimit,
            },
        );
    }

    // Token -> Token
    return kyberNetwork.swapTokenToToken(
        fromAddress,
        fromAmountWei,
        toAddress,
        minConversionRate,
        {
            gasLimit,
        },
    );
};

const swapAndLog = async (fromToken, toToken, amount) => {
    console.log(`Swapping ${amount} ${fromToken.symbol} to ${toToken.symbol}`);

    await swapOnKyber(
        fromToken.address,
        toToken.address,
        ethers.utils.parseUnits(amount.toString(), fromToken.decimals),
    );

    if (fromToken === erc20.eth) {
        const ethBalWei = await wallet.getBalance();
        console.log(
            `Remaining ether balance: ${ethers.utils.formatEther(ethBalWei)}`,
        );
    }
};

const main = async () => {
    await swapAndLog(erc20.eth, erc20.usdc, 0.1);
};

main();

