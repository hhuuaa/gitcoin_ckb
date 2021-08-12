import Web3 from 'web3';
import * as SimpleChatJSON from '../../../build/contracts/SimpleChat.json';
import { SimpleChat } from '../../types/SimpleChat';
import { DEFAULT_SEND_OPTIONS } from '../../config';

export class SimpleChatWrapper {
    web3: Web3;

    contract: SimpleChat;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(SimpleChatJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getLastMessage(fromAddress: string): Promise<string> {
        const data = await this.contract.methods.get().call({ from: fromAddress });
        console.log(data);
        return data as string;
    }

    async appendMessage(message: string, fromAddress: string) {
        const tx = await this.contract.methods.set(message).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return tx;
    }

    async deploy(fromAddress: string) {
        const contract = await (this.contract
            .deploy({
                data: SimpleChatJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(contract.contractAddress);
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
