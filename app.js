"use strict";

const CONTRACT_ADDRESS = "0xF31d37086883F2479d99DBA16A428c20223F8fB1";
const SEPOLIA_CHAIN_ID = 11155111n;
const SEPOLIA_HEX = "0xaa36a7";
const CONTRACT_ABI = [
  "function deposit() payable",
  "function withdraw(uint256 amount)",
  "function checkBlance() view returns (uint256)",
  "event Deposit(address indexed owner, uint256 amount)",
  "event Withdraw(address indexed owner, uint256 amount)"
];

const el = (id) => document.getElementById(id);
let provider = null;
let signer = null;
let contract = null;
let account = null;
let busy = false;
let currentChain = null;

function shorten(address) {
  return address ? address.slice(0, 6) + "…" + address.slice(-4) : "—";
}
function setStatus(message, type = "info", txHash = null) {
  const node = el("statusMessage");
  node.className = "status-message" + (type === "info" ? "" : " " + type);
  node.replaceChildren(document.createTextNode(message));
  if (txHash) {
    const a = document.createElement("a");
    a.href = "https://sepolia.etherscan.io/tx/" + txHash;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = " ดูธุรกรรม ↗";
    node.append(a);
  }
}
function errorText(error) {
  if (error?.code === 4001 || error?.code === "ACTION_REJECTED") return "ยกเลิกรายการใน MetaMask";
  const nested = error?.info?.error?.message || error?.shortMessage || error?.reason || error?.message;
  if (typeof nested !== "string") return "เกิดข้อผิดพลาด โปรดลองอีกครั้ง";
  if (/insufficient funds/i.test(nested)) return "Sepolia ETH ในกระเป๋าไม่เพียงพอสำหรับจำนวนเงินและค่า Gas";
  if (/not enough money/i.test(nested)) return "ยอดเงินฝากใน Smart Contract ไม่เพียงพอ";
  if (/missing revert data|estimateGas|execution reverted/i.test(nested)) return "Smart Contract ปฏิเสธรายการหรือประเมิน Gas ไม่สำเร็จ ตรวจสอบยอดเงินและบัญชี แล้วลองใหม่ (ไม่ควร Force Send)";
  return nested.slice(0, 250);
}
function setControls() {
  const ready = !!(account && contract && currentChain === SEPOLIA_CHAIN_ID);
  el("depositButton").disabled = !ready || busy;
  el("withdrawButton").disabled = !ready || busy;
  el("refreshButton").disabled = !ready || busy;
  el("connectButton").disabled = busy;
  el("switchNetworkButton").classList.toggle("hidden", !(account && currentChain !== SEPOLIA_CHAIN_ID));
}
function disconnectState(message = "ยังไม่ได้เชื่อมต่อกระเป๋าเงิน") {
  account = null;
  contract = null;
  signer = null;
  provider = null;
  currentChain = null;
  el("connectionDot").className = "connection-dot";
  el("connectionStatus").textContent = message;
  el("walletAddress").textContent = "กดเชื่อมต่อ MetaMask เพื่อเริ่มต้นใช้งาน";
  el("connectButtonText").textContent = "เชื่อมต่อ MetaMask";
  el("networkStatus").textContent = "NETWORK · —";
  el("bankBalance").textContent = "—";
  el("walletBalance").textContent = "—";
  setControls();
}
async function refreshBalances() {
  if (!provider || !account || !contract || currentChain !== SEPOLIA_CHAIN_ID) return;
  const activeAccount = account;
  const [deposited, wallet] = await Promise.all([
    contract.checkBlance(),
    provider.getBalance(activeAccount)
  ]);
  if (activeAccount !== account) return;
  el("bankBalance").textContent = formatEth(deposited);
  el("walletBalance").textContent = formatEth(wallet);
}
function formatEth(amountWei) {
  const eth = ethers.formatEther(amountWei);
  return eth.includes(".") ? eth.replace(/0+$/, "").replace(/\.$/, "") : eth;
}
async function connectWallet(requestAccounts = true) {
  if (!window.ethereum) {
    setStatus("ไม่พบกระเป๋าเงินที่รองรับ Ethereum กรุณาเปิดเว็บใน Browser ที่ติดตั้ง MetaMask", "error");
    return;
  }
  if (!window.ethers) {
    setStatus("โหลด ethers.js ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตและรีเฟรชหน้า", "error");
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send(requestAccounts ? "eth_requestAccounts" : "eth_accounts", []);
    if (!accounts.length) {
      disconnectState();
      if (requestAccounts) setStatus("ยังไม่ได้อนุญาตให้เว็บเข้าถึงบัญชี", "error");
      return;
    }
    signer = await provider.getSigner();
    account = await signer.getAddress();
    const network = await provider.getNetwork();
    currentChain = network.chainId;
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    el("walletAddress").textContent = account;
    el("connectButtonText").textContent = shorten(account);
    el("networkStatus").textContent = "NETWORK · " + (currentChain === SEPOLIA_CHAIN_ID ? "SEPOLIA" : String(currentChain));
    if (currentChain !== SEPOLIA_CHAIN_ID) {
      el("connectionDot").className = "connection-dot warning";
      el("connectionStatus").textContent = "เครือข่ายไม่ถูกต้อง";
      el("bankBalance").textContent = "—";
      el("walletBalance").textContent = "—";
      setStatus("โปรดเปลี่ยน MetaMask เป็น Sepolia Testnet ก่อนทำรายการ", "error");
    } else {
      el("connectionDot").className = "connection-dot connected";
      el("connectionStatus").textContent = "เชื่อมต่อกระเป๋าเงินแล้ว";
      await refreshBalances();
      setStatus("พร้อมใช้งาน Bank DApp บน Sepolia");
    }
  } catch (error) {
    setStatus(errorText(error), "error");
  } finally {
    setControls();
  }
}
async function switchNetwork() {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_HEX }] });
    await connectWallet(false);
  } catch (error) {
    if (error?.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: SEPOLIA_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
            blockExplorerUrls: ["https://sepolia.etherscan.io"]
          }]
        });
        await connectWallet(false);
      } catch (addError) {
        setStatus(errorText(addError), "error");
      }
    } else setStatus(errorText(error), "error");
  }
}
function parsePositiveEth(input) {
  const str = input.trim();
  if (!/^(?:\d+)(?:\.\d{1,18})?$/.test(str)) throw new Error("กรอกจำนวน ETH เป็นตัวเลขบวก โดยมีทศนิยมได้ไม่เกิน 18 ตำแหน่ง");
  const wei = ethers.parseEther(str);
  if (wei <= 0n) throw new Error("จำนวนเงินต้องมากกว่า 0");
  return wei;
}
function appendActivity(kind, wei, hash) {
  const list = el("activityList");
  const empty = list.querySelector(".empty-state");
  if (empty) empty.remove();
  const item = document.createElement("div");
  item.className = "activity-item";
  const symbol = document.createElement("span");
  symbol.className = "action-icon " + (kind === "deposit" ? "deposit-icon" : "withdraw-icon");
  symbol.textContent = kind === "deposit" ? "↓" : "↑";
  symbol.style.width = "38px";
  symbol.style.height = "38px";
  const description = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = kind === "deposit" ? "ฝากเงินสำเร็จ" : "ถอนเงินสำเร็จ";
  const time = document.createElement("small");
  time.textContent = new Date().toLocaleString("th-TH");
  description.append(title, time);
  const amount = document.createElement("span");
  amount.className = "activity-amount";
  amount.textContent = (kind === "deposit" ? "+" : "−") + formatEth(wei) + " ETH";
  const link = document.createElement("a");
  link.href = "https://sepolia.etherscan.io/tx/" + hash;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "activity-link";
  link.textContent = "↗";
  link.setAttribute("aria-label", "ดูธุรกรรมบน Etherscan");
  item.append(symbol, description, amount, link);
  list.prepend(item);
}
async function runTransaction(kind) {
  if (busy || !contract || !provider || !account || currentChain !== SEPOLIA_CHAIN_ID) {
    setStatus("กรุณาเชื่อมต่อ MetaMask บน Sepolia ก่อนทำรายการ", "error");
    return;
  }
  const input = el(kind === "deposit" ? "depositAmount" : "withdrawAmount");
  let wei;
  try { wei = parsePositiveEth(input.value); }
  catch (err) { setStatus(err.message, "error"); return; }
  busy = true;
  setControls();
  let hash = null;
  try {
    if (kind === "withdraw") {
      const balance = await contract.checkBlance();
      if (wei > balance) throw new Error("ยอดเงินฝากไม่เพียงพอสำหรับการถอนจำนวนนี้");
    }
    setStatus("รอการยืนยันธุรกรรมจาก MetaMask…");
    const tx = kind === "deposit" ? await contract.deposit({ value: wei }) : await contract.withdraw(wei);
    hash = tx.hash;
    setStatus("ส่งธุรกรรมแล้ว กำลังรอการยืนยันบน Sepolia…", "info", hash);
    const receipt = await tx.wait();
    if (!receipt || receipt.status !== 1) throw new Error("ธุรกรรมไม่สำเร็จ");
    appendActivity(kind, wei, hash);
    input.value = "";
    await refreshBalances();
    setStatus((kind === "deposit" ? "ฝากเงิน" : "ถอนเงิน") + "สำเร็จแล้ว", "success", hash);
  } catch (err) {
    setStatus(errorText(err), "error", hash);
  } finally {
    busy = false;
    setControls();
  }
}
el("connectButton").addEventListener("click", () => connectWallet(true));
el("switchNetworkButton").addEventListener("click", switchNetwork);
el("refreshButton").addEventListener("click", async () => {
  try { await refreshBalances(); setStatus("อัปเดตยอดเงินล่าสุดแล้ว"); }
  catch (err) { setStatus(errorText(err), "error"); }
});
el("depositForm").addEventListener("submit", (event) => { event.preventDefault(); runTransaction("deposit"); });
el("withdrawForm").addEventListener("submit", (event) => { event.preventDefault(); runTransaction("withdraw"); });
el("copyContractButton").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(CONTRACT_ADDRESS); setStatus("คัดลอก Contract Address แล้ว"); }
  catch { setStatus("คัดลอกไม่ได้ กรุณาคัดลอกจากกล่อง Contract Address", "error"); }
});
if (window.ethereum) {
  window.ethereum.on("accountsChanged", (accounts) => {
    if (!accounts.length) disconnectState();
    else if (!busy) connectWallet(false);
    else setStatus("กระเป๋าเงินเปลี่ยนระหว่างธุรกรรม กรุณาตรวจสอบผลบน Etherscan", "error");
  });
  window.ethereum.on("chainChanged", () => {
    if (!busy) connectWallet(false);
    else setStatus("เครือข่ายเปลี่ยนระหว่างธุรกรรม กรุณาตรวจสอบผลบน Etherscan", "error");
  });
}
disconnectState();
if (window.ethereum && window.ethers) connectWallet(false);
