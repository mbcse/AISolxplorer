export const ERC721_EVENTS_ABI = [  
    // ERC721 Events
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];


export const EVENTS_ABI = [
    // ERC20 Events
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  
    // ERC721 Events
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    
    // ERC1155 Events
    "event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)",
    "event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)"
];