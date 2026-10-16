# Sepolia Bank DApp — Assignment 5

Static frontend for the Bank Solidity Smart Contract deployed to Sepolia. Built with HTML, CSS, vanilla JavaScript and ethers.js v6. No backend or private keys.

## Contract
- Network: Sepolia Testnet (chain ID 11155111)
- Contract: `0xF31d37086883F2479d99DBA16A428c20223F8fB1`
- [View contract on Sepolia Etherscan](https://sepolia.etherscan.io/address/0xF31d37086883F2479d99DBA16A428c20223F8fB1#code)

## Features
- Connect MetaMask / detect selected account and network
- Switch to Sepolia if necessary
- Show deposited contract balance via `checkBlance()` and wallet ETH balance
- Deposit via `deposit()`
- Withdraw via `withdraw(uint256)`
- Show transactions performed in the current page session with Etherscan links
- Responsive dashboard and contract details

## Before submission
**Update the student information in `index.html`** (find `id="studentId"` and `id="studentName"`). They are placeholders until the real student information is supplied.

## GitHub Pages
1. Open repository **Settings → Pages**
2. Under **Build and deployment**, select **Deploy from a branch**
3. Select **main**, folder **/(root)**, and save
4. Open https://guideDmak.github.io/Bank-DApp/ after GitHub completes deployment

## Test
1. Open the page in a browser with MetaMask.
2. Connect the wallet and ensure Sepolia is selected.
3. Check the deposited balance.
4. Deposit a small amount of **Sepolia test ETH**, then refresh the balance.
5. Withdraw no more than deposited balance, then check the balance again.
6. Review each transaction on Etherscan.

> This is an educational demo on Sepolia only, not a real bank. Never enter your seed phrase or private key on this website. Transactions require explicit confirmation in your wallet. A gas fee in Sepolia ETH may apply.

## Files
- `index.html` — UI layout
- `style.css` — responsive styling
- `app.js` — MetaMask/ethers.js and contract interactions

Note: `checkBlance` matches the deployed Solidity function name exactly.
