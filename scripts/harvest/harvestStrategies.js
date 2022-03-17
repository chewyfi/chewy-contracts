const hardhat = require("hardhat");
const strategyAbi = require('./strategy.json');
const strategyNativeAbi = require('./strategy.json');

const MW_ETH = "0xF62D54f768A3bbE1ca2008125B35E79C38a279f2";
const MW_USDC = "0xaa0dF6A1dBE11848fA4f824AbD076d994166B94e";
const MW_FRAX = "0x5bE32dA7627570c34da15B3410a15D6723d58306";
const MW_USDT = "0xB1793CF2806Fd2F9a1096eb12e7f9dd975462372";
const MW_MOVR = "0x9CA8902E42300d5E2Afb890F690bC1139c965A23";
const MW_BTC = "0x56dc314E5Be27cA60Cb60C725fc1585F0e20Dcc9";

const SB_3POOL = "0x6446cf64ba8D468f9De5E9144EC479469c93fa11";
const SB_FRAX_3POOL = "0xaeC10e47362B3e4513432aF28d574460A0027CE8";
const SB_KSM_POOL = "0x7DAEDEF2e6C3644b166d4dC28A77A5609d1160Cb";

const strategies = [
	{address: MW_ETH, contractName: "StrategyScream", strategyName: "ETH Moonwell"},
	{address: MW_USDC, contractName: "StrategyScream", strategyName: "USDC Moonwell"},
	{address: MW_FRAX, contractName: "StrategyScream", strategyName: "FRAX Moonwell"},
	{address: MW_USDT, contractName: "StrategyScream", strategyName: "USDT Moonwell"},
	{address: MW_MOVR, contractName: "StrategyScreamNative", strategyName: "MOVR Native Moonwell"},
	{address: MW_BTC, contractName: "StrategyScreamSupplyOnly", strategyName: "BTC Supply Only Moonwell"},
	{address: SB_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "3pool SolarBeam"},
	{address: SB_FRAX_3POOL, contractName: "StrategySolarbeamFarm", strategyName: "Frax-3pool SolarBeam"},
	{address: SB_KSM_POOL, contractName: "StrategySolarbeamFarm", strategyName: "KSM pool SolarBeam"},
];


async function main() {
	await hardhat.run("compile");
	const provider = new ethers.getDefaultProvider('https://moonriver-api.bwarelabs.com/c7724063-cf96-46df-81ca-4bb265cafdf5');
	const wallet = new ethers.Wallet("627a7e6b5581787cb92eb7fd0e972ac7677562fa2f5334da6861dfa83e525b11", provider);

	for (let i = 0; i < strategies.length; i++) {
		console.log(`Harvesting ${strategies[i].strategyName}`)
		if (strategies[i].contractName === "StrategyScreamNative") {
			console.log('its native')
			// let strategy = new ethers.Contract(strategies[i].address, strategyNativeAbi, wallet);
			// await strategy.harvest();
		} else {
			let strategy = new ethers.Contract(strategies[i].address, strategyAbi, wallet);
			await strategy.managerHarvest();
		}
	}
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
});