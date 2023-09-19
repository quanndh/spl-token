import "./mpl_metadata.sol";
import "./spl_token.sol";

@program_id("GuWgBqrxvVP1UrD8FMVuSkDFfAJg5rjkS4aCwFamosFh")
contract token {
    // Creating a dataAccount is required by Solang
    // The account is unused in this example
    @payer(payer) // payer account
    constructor() {
         
    }

    function createTokenMint(
        address payer, // payer account
        address mintAccount, // mint account to be created
        address mintAuthority, // mint authority for the mint account
        address freezeAuthority, // freeze authority for the mint account
        address metadata, // metadata account to be created
        uint8 decimals, // decimals for the mint account
        string name, // name for the metadata account
        string symbol, // symbol for the metadata account
        string uri // uri for the metadata account
    ) public {
        // Invoke System Program to create a new account for the mint account and,
        // Invoke Token Program to initialize the mint account
        // Set mint authority, freeze authority, and decimals for the mint account
        SplToken.create_mint(
            payer,            // payer account
            mintAccount,            // mint account
            mintAuthority,   // mint authority
            freezeAuthority, // freeze authority
            decimals         // decimals
        );

        // Invoke Metadata Program to create a new account for the metadata account
        MplMetadata.create_metadata_account(
            metadata, // metadata account
            mintAccount,  // mint account
            mintAuthority, // mint authority
            payer, // payer
            payer, // update authority (of the metadata account)
            name, // name
            symbol, // symbol
            uri // uri (off-chain metadata json)
        );
    }

    function balanceOf(address account) public view returns (uint64) {
        return SplToken.get_balance(account);
    }

    function totalSupply(address mintAccount) public view returns (uint64) {
        return SplToken.total_supply(mintAccount);
    }

    function mint(address mintAuthority, address tokenAccount, address mintAccount, uint64 amount) public {
        // Mint tokens to the token account
        SplToken.mint_to(
            mintAccount, // mint account
            tokenAccount, // token account
            mintAuthority, // mint authority
            amount // amount
        );
    }

     // Transfer tokens from one token account to another via Cross Program Invocation to Token Program
    function transfer(
        address from, // token account to transfer from
        address to, // token account to transfer to
        uint64 amount // amount to transfer
    ) public {
        SplToken.TokenAccountData from_data = SplToken.get_token_account_data(from);
        SplToken.transfer(from, to, from_data.owner, amount);
    }
}
