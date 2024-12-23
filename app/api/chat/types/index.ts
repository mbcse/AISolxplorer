export interface TRANSFERS {
    tokenType: string;
    token: any;
    from: string;
    to: string;
    value?: string;
    tokenId?: string;
    tokenIds?: string[];
    amounts?: string[];
    operator?: string;
  }