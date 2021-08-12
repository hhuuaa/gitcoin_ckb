import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { toast, ToastContainer } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { AddressTranslator } from 'nervos-godwoken-integration';

import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { CONFIG } from '../config';
import { SimpleChatWrapper } from '../lib/contracts/SimpleChatWrapper';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };

        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);

        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

const addressTranslator = new AddressTranslator();

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<SimpleChatWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [balance, setBalance] = useState<bigint>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [messageValues, setMessageValues] = useState<Array<string>>([]);
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const toastId = React.useRef(null);
    const [newInputMessage, setNewInputMessage] = useState<string | undefined>();
    const account = accounts?.[0];
    const polyjuiceAddress = account && addressTranslator.ethAddressToGodwokenShortAddress(account);

    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    // useEffect(() => {
    //     if (contract) {
    //         console.log('monitor: ', contract);
    //         contract.contract.events.Message((_, message) => {
    //             try {
    //                 const resp = message.returnValues;
    //                 const talker = `${resp.talker.slice(0, 4)}...${resp.talker.slice(-4)}`;
    //                 const line = `${talker}: "${resp.message}"`;
    //                 setMessageValues(prevState =>
    //                     Array.isArray(prevState) ? [...prevState, line] : [line]
    //                 );
    //             } catch (e) {
    //                 console.error(e);
    //             }
    //         });
    //     }
    // }, [contract]);

    useEffect(() => {
        if (!contract || !account) {
            return () => undefined;
        }

        const id = setInterval(async () => {
            try {
                const message = await contract.getLastMessage(account);
                setMessageValues(prevState => {
                    if (Array.isArray(prevState)) {
                        if (!prevState.includes(message)) {
                            return [...prevState, message];
                        } else {
                            return [...prevState];
                        }
                    } else {
                        return [message];
                    }
                });
            } catch (e) {
                console.error(e);
            }
        }, 1000);
        return () => clearInterval(id);
    }, [contract, account]);

    async function deployContract() {
        const _contract = new SimpleChatWrapper(web3);

        try {
            setTransactionInProgress(true);

            await _contract.deploy(account);

            setExistingContractAddress(_contract.address);

            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast('There was an error sending your transaction. Please check developer console.');
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new SimpleChatWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
        setMessageValues(undefined);
    }

    async function appendNewMessage() {
        try {
            setTransactionInProgress(true);
            await contract.appendMessage(newInputMessage, account);
            toast('Successfully set latest message. ', { type: 'success' });
        } catch (error) {
            console.error(error);
            toast('There was an error sending your transaction. Please check developer console.');
        } finally {
            setTransactionInProgress(false);
        }
    }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setBalance(_l2Balance);
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            Your ETH address: <b>{accounts?.[0]}</b>, and polyjuice address:{' '}
            <b>{polyjuiceAddress}</b>
            <br />
            <br />
            Balance: <b>{balance ? (balance / 10n ** 8n).toString() : <LoadingIndicator />} ETH</b>
            <br />
            <br />
            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            <br />
            <hr />
            <button onClick={deployContract} disabled={!balance}>
                Deploy contract
            </button>
            &nbsp;or&nbsp;
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br />
            <br />
            {messageValues ? (
                <div>
                    Chats:
                    {messageValues.map(i => (
                        <p key={`m:${i}`}>{i}</p>
                    ))}
                </div>
            ) : null}
            <br />
            <br />
            <input onChange={e => setNewInputMessage(e.target.value)} />
            <button onClick={appendNewMessage} disabled={!contract}>
                send
            </button>
            <br />
            <br />
            <br />
            <br />
            <hr />
            <ToastContainer />
        </div>
    );
}
