import { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import { Connection, PublicKey, clusterApiUrl} from '@solana/web3.js';
import {
  Program, Provider, web3
} from '@project-serum/anchor';
import kp from './keypair.json'

import idl from './idl.json';

// SystemProgram is a reference to the Solana runtime!
// const { SystemProgram, Keypair } = web3;
const { SystemProgram} = web3;

// Create a keypair for the account that will hold the GIF data.
// let baseAccount = Keypair.generate();

// Get keypair from file
const arr = Object.values(kp._keypair.secretKey)
const secret = new Uint8Array(arr)
const baseAccount = web3.Keypair.fromSecretKey(secret)

// Get our program's id form the IDL file.
const programID = new PublicKey(idl.metadata.address);

// Set our network to devent.
const network = clusterApiUrl('devnet');

// Control's how we want to acknowledge when a trasnaction is "done".
const opts = {
  preflightCommitment: "processed"
}

// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

// const TEST_GIFS = [
//  'https://media.giphy.com/media/zrvFl1IDvy0PC/giphy.gif',
//  'https://media.giphy.com/media/RBDXLadJCxs6A/giphy.gif',
//  'https://media.giphy.com/media/l0IylOPCNkiqOgMyA/giphy.gif',
//  'https://media.giphy.com/media/90bu0dxI23uhy/giphy.gif',
//  // 'https://media.giphy.com/media/xLnGUEYWS0btPHCZoo/giphy.gif'
// ]

const App = () => {

  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [tipValue, setTipValue] = useState('');
  const [gifList, setGifList] = useState([]);

  /*
   * This function holds the logic for deciding if a Phantom Wallet is
   * connected or not
   */
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
        
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  /*
   * Let's define this method so our code doesn't break.
   * We will write the logic for this next!
   */
  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const onTipChange = (event) => {
    const { value } = event.target;
    setTipValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection, window.solana, opts.preflightCommitment,
    );
    return provider;
  }

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping")
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address:", baseAccount.publicKey.toString())
      await getGifList();

    } catch(error) {
      console.log("Error creating BaseAccount account:", error)
    }
  }

  
  const sendSolTip = async () => {
    if (tipValue.length > 0) {
      console.log('Tip value:', tipValue);
      try {
        const connection = new Connection(network, opts.preflightCommitment);
        const provider = getProvider();
        // const program = new Program(idl, programID, provider);

        // Add transfer instruction to transaction
        var transaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: provider.wallet.publicKey,
            toPubkey: gifList[0].userAddress,
            lamports: web3.LAMPORTS_PER_SOL * tipValue,
          }),
        );
      
        // Sign transaction, broadcast, and confirm
        var signature = await web3.sendAndConfirmTransaction(
          connection,
          transaction,
          [provider],
        );

        console.log('SIGNATURE', signature);

      } catch (error) {
        console.log("Error sending tip:", error)
      }
    } else {
      console.log('Tip has to be non-zero');
    }
  }

  const sendGif = async () => {
    if (inputValue.length > 0) {
      console.log('Gif link:', inputValue);
      try {
        const provider = getProvider();
        const program = new Program(idl, programID, provider);

        await program.rpc.addGif(inputValue, {
          accounts: {
            baseAccount: baseAccount.publicKey,
            user: provider.wallet.publicKey,
          },
        });
        console.log("GIF sucesfully sent to program", inputValue)

        await getGifList();
      } catch (error) {
        console.log("Error sending GIF:", error)
      }
    } else {
      console.log('Empty input. Try again.');
    }
  };

  /*
   * We want to render this UI when the user hasn't connected
   * their wallet to our app yet.
   */
  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
    // If we hit this, it means the program account hasn't be initialized.
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button className="cta-button submit-gif-button" onClick={createGifAccount}>
            Do One-Time Initialization For GIF Program Account
          </button>
        </div>
      )
    } 
    // Otherwise, we're good! Account exists. User can submit GIFs.
    else {
      return(
        <div className="connected-container">
        <input type="text" 
        placeholder="Enter gif link!"
        value={inputValue}
        onChange={onInputChange}
        />
        <button className="cta-button submit-gif-button" onClick={sendGif}>
          Submit
        </button>
        <div className="gif-grid">
          {/* We use index as the key instead, also, the src is now item.gifLink */}
          {gifList.map((item, index) => (
              <div className="gif-item" key={index}>
                <img src={item.gifLink} />
                {/* Add user wallet address below gif */}
                <p className="wallet-addr-text"> 
                  {item.userAddress.toString()}
                  <input type="text"
                  placeholder="Enter tip amount"
                  value={tipValue}
                  onChange={onTipChange}
                  />
                  <button className="cta-button give-tip-button" >
                  {/* <button className="cta-button give-tip-button" onClick={sendSolTip}> */}
                    TIP
                  </button>
                </p>
              </div>
            ))}
          </div>
        </div>
      )
    }
  };

  /*
   * When our component first mounts, let's check to see if we have a connected
   * Phantom Wallet
   */
  useEffect(() => {
    window.addEventListener('load', async (event) => {
      await checkIfWalletIsConnected();
    });
  }, []);

  const getGifList = async() => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);
      
      console.log("Got the account", account)
      setGifList(account.gifList)

    } catch (error) {
      console.log("Error in getGifs: ", error)
      setGifList(null);
    }
  }

  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      getGifList()
    }
  }, [walletAddress]);

  return (
    <div className="App">
      {/* This was solely added for some styling fanciness */}
      <div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">Always Sunny GIF Portal</p>
          <p className="sub-text">
            View your favorite GIFs from Always Sunny
          </p>
          <p className="sub-text"> 
            {/* Render your connect to wallet button right here */}
            { !walletAddress && renderNotConnectedContainer() }

            {/* We just need to add the inverse here! */}
            {walletAddress && renderConnectedContainer()}
          </p>
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
