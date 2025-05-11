// pages/_app.js
import '@/styles/globals.css';
import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  const { theme, initializeTheme } = useStore(state => ({ theme: state.theme, initializeTheme: state.initializeTheme }));

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <>
      <Head>
        <title>Secure P2P Chat</title>
        <meta name="description" content="Privacy-first peer-to-peer chat application" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" href="/favicon.ico" /> {/* Create a favicon.ico in /public */}
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
