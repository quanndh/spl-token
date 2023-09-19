import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Metaplex } from "@metaplex-foundation/js";
import { SYSVAR_RENT_PUBKEY, SystemProgram, PublicKey } from "@solana/web3.js";
import { Token } from "../target/types/token";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

describe("token", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Token as Program<Token>;

  // Generate new keypair to use as data account
  const dataAccount = anchor.web3.Keypair.generate();

  // Generate a new keypair for the mint
  const mintKeypair = anchor.web3.Keypair.generate();

  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  // Metadata for the token
  const tokenTitle = "Solana TEST";
  const tokenSymbol = "SOLTES";
  const tokenUri =
    "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json";

  it("Is initialized!", async () => {
    // Initialize data account for the program, which is required by Solang
    const tx = await program.methods
      .new()
      .accounts({ dataAccount: dataAccount.publicKey })
      .signers([dataAccount])
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Create an SPL Token!", async () => {
    // Get the metadata address for the mint
    const metaplex = Metaplex.make(connection);
    const metadataAddress = await metaplex
      .nfts()
      .pdas()
      .metadata({ mint: mintKeypair.publicKey });

    const tx = await program.methods
      .createTokenMint(
        wallet.publicKey, // payer
        mintKeypair.publicKey, // mint
        wallet.publicKey, // freeze authority
        wallet.publicKey, // mint authority
        metadataAddress, // metadata address
        9, // decimals for the mint (0 for NFT)
        tokenTitle, // token name
        tokenSymbol, // token symbol
        tokenUri // token uri (off-chain metadata)
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        { pubkey: mintKeypair.publicKey, isWritable: true, isSigner: true },
        {
          pubkey: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"), // Metadata program id
          isWritable: false,
          isSigner: false,
        },
        { pubkey: metadataAddress, isWritable: true, isSigner: false },
        { pubkey: SystemProgram.programId, isWritable: false, isSigner: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false },
      ])
      .signers([mintKeypair])
      .rpc({ skipPreflight: true });
    console.log("Your transaction signature", tx);
  });

  it("Mint some tokens to your wallet!", async () => {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer, // payer
      mintKeypair.publicKey, // mint
      wallet.publicKey // owner
    );

    const tx = await program.methods
      .mint(
        wallet.publicKey, // payer
        tokenAccount.address, // associated token account address
        mintKeypair.publicKey, // mint
        new anchor.BN(150) // amount to mint
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        { pubkey: tokenAccount.address, isWritable: true, isSigner: false },
        { pubkey: mintKeypair.publicKey, isWritable: true, isSigner: false },
        {
          pubkey: SystemProgram.programId,
          isWritable: false,
          isSigner: false,
        },
        { pubkey: TOKEN_PROGRAM_ID, isWritable: false, isSigner: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isWritable: false,
          isSigner: false,
        },
      ])
      .rpc({ skipPreflight: true });
    console.log("Your transaction signature", tx);
  });

  it("My balance", async () => {
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer, // payer
      mintKeypair.publicKey, // mint
      wallet.publicKey // owner
    );
    const balance = await program.methods
      .balanceOf(tokenAccount.address)
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        { pubkey: tokenAccount.address, isSigner: false, isWritable: false },
      ])
      .view();

    console.log("Your balance", balance.toNumber());
  });

  it("Transfer some tokens to another wallet!", async () => {
    // Wallet's associated token account address for mint
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer, // payer
      mintKeypair.publicKey, // mint
      wallet.publicKey // owner
    );

    const receipient = anchor.web3.Keypair.generate();
    const receipientTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer, // payer
      mintKeypair.publicKey, // mint account
      receipient.publicKey // owner account
    );

    const tx = await program.methods
      .transfer(
        tokenAccount.address,
        receipientTokenAccount.address,
        new anchor.BN(150)
      )
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: wallet.publicKey,
          isWritable: true,
          isSigner: true,
        },
        {
          pubkey: mintKeypair.publicKey,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: tokenAccount.address,
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: receipientTokenAccount.address,
          isWritable: true,
          isSigner: false,
        },
      ])
      .rpc();

    const balance = await program.methods
      .balanceOf(tokenAccount.address)
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        { pubkey: tokenAccount.address, isSigner: false, isWritable: false },
      ])
      .view();

    const receiverBalance = await program.methods
      .balanceOf(receipientTokenAccount.address)
      .accounts({ dataAccount: dataAccount.publicKey })
      .remainingAccounts([
        {
          pubkey: receipientTokenAccount.address,
          isSigner: false,
          isWritable: false,
        },
      ])
      .view();

    console.log("Your balance after transfer", balance.toNumber());
    console.log(
      "Receiver's balance after transfer",
      receiverBalance.toNumber()
    );
  });
});
