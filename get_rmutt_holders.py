from os import getenv
from os.path import abspath
from json import load as json_load

import arrow
from web3 import Web3
from dotenv import load_dotenv


# Read from .env
load_dotenv()

# web3 providers and network details
MAINNET = getenv('MAINNET', 'false')
MAINNET = MAINNET != 'false'
INFURA_PID = getenv('INFURA_PID')
if MAINNET:
    WEB3_PROVIDER_URI = f'https://mainnet.infura.io/v3/{INFURA_PID}'
    NETWORK = '1'
else:
    WEB3_PROVIDER_URI = f'https://rinkeby.infura.io/v3/{INFURA_PID}'
    NETWORK = '4'

w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URI))


def get_eth_contract(_rp):
    """
    Return a web3 contract object for a compiled
    contract at a given relative path.
    """
    compiled_contract_path = abspath(_rp)

    with open(compiled_contract_path) as file:
        contract_json = json_load(file)
        contract_abi = contract_json['abi']

    deployed_contract_address = w3.toChecksumAddress('0x6c61fB2400Bf55624ce15104e00F269102dC2Af4')
    contract = w3.eth.contract(address=deployed_contract_address, abi=contract_abi)
    return contract

if __name__ == '__main__':
    print(f'[{arrow.now()}] Taking snapshot of RMUTT hodlers.')
    master_dict = dict()
    rmutt_contract = get_eth_contract('../rmutt-contract/build/contracts/RMutt.json')
    rmutt_supply = rmutt_contract.functions.totalSupply().call()
    print(f'[{arrow.now()}] Looping through RMUTT supply ({rmutt_supply})')
    for i in range(0, rmutt_supply):
        owner = rmutt_contract.functions.ownerOf(i).call()
        print(f'Found token {i} with owner {owner}')
        if owner not in master_dict:
            master_dict[owner] = 0
        master_dict[owner] += 1
    print(f'[{arrow.now()}] Found {len(master_dict)} RMUTT owners for whitelisting! Storing addresses and allotment for generating merkle tree for distribution.')
    with open('output.csv', 'w') as f:
        for res in master_dict:
            f.write(f'{res},{master_dict[res]}\n')
